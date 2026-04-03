import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import cron from 'node-cron';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from "docx";
import { marked } from "marked";
import { sendRecallMessage } from './src/services/whatsappService.ts';
import { successUrl, cancelUrl, PRICES } from "./src/billingConfig.ts";

dotenv.config();

// Initialize Firebase Admin lazily to prevent crashing if credentials are not set
let firebaseAdminInitialized = false;
function getFirebaseAdmin() {
  if (!firebaseAdminInitialized) {
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
          credential: cert(serviceAccount)
        });
      } else {
        // Fallback to default credentials if available in the environment
        initializeApp();
      }
      firebaseAdminInitialized = true;
    } catch (e) {
      console.error("Firebase Admin initialization failed:", e);
    }
  }
  return { firestore: getFirestore };
}

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    if (key.startsWith("pk_")) {
      throw new Error("You are using a Publishable Key (starts with pk_) for Stripe. Please use your Secret Key (starts with sk_) in the STRIPE_SECRET_KEY environment variable.");
    }
    stripeClient = new Stripe(key, { apiVersion: "2023-10-16" as any });
  }
  return stripeClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Webhook needs raw body
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).send("Missing signature or webhook secret");
    }

    try {
      const stripe = getStripe();
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id;

        if (userId) {
          const fbAdmin = getFirebaseAdmin();
          await fbAdmin.firestore().collection("users").doc(userId).set({
            isPro: true
          }, { merge: true });
          console.log(`Successfully upgraded user ${userId} to Pro`);
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("Webhook Error:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });

  app.use(express.json());

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { userId, tier, plan } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const priceId = PRICES[tier as 'consultant' | 'enterprise'][plan as 'monthly' | 'yearly'];

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl(),
        cancel_url: cancelUrl(),
        client_reference_id: userId,
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/export/docx/:userId/:patientId/:scanId", async (req, res) => {
    try {
      const { userId, patientId, scanId } = req.params;
      const fbAdmin = getFirebaseAdmin();
      const db = fbAdmin.firestore();

      const scanDoc = await db.collection("users").doc(userId)
        .collection("patients").doc(patientId)
        .collection("scans").doc(scanId).get();

      if (!scanDoc.exists) {
        return res.status(404).send("Scan not found");
      }

      const scanData = scanDoc.data();
      const markdown = scanData?.reportMarkdown || "";
      const tokens = marked.lexer(markdown);

      const children: any[] = [];

      // Add Header
      children.push(new Paragraph({
        text: "OGXAI Ultrasound Report",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }));

      tokens.forEach((token: any) => {
        if (token.type === "heading") {
          children.push(new Paragraph({
            text: token.text,
            heading: token.depth === 1 ? HeadingLevel.HEADING_1 : token.depth === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 120 }
          }));
        } else if (token.type === "paragraph") {
          children.push(new Paragraph({
            children: [new TextRun(token.text)],
            spacing: { after: 120 }
          }));
        } else if (token.type === "list") {
          token.items.forEach((item: any) => {
            children.push(new Paragraph({
              text: item.text,
              bullet: { level: 0 },
              spacing: { after: 80 }
            }));
          });
        } else if (token.type === "table") {
          const rows = [
            new TableRow({
              children: token.header.map((cell: any) => new TableCell({
                children: [new Paragraph({
                  children: [new TextRun({ text: cell.text, bold: true })]
                })],
                shading: { fill: "F2F2F2" }
              }))
            }),
            ...token.rows.map((row: any) => new TableRow({
              children: row.map((cell: any) => new TableCell({
                children: [new Paragraph({ text: cell.text })]
              }))
            }))
          ];

          children.push(new Table({
            rows,
            width: { size: 100, type: WidthType.PERCENTAGE }
          }));
        }
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children
        }]
      });

      const buffer = await Packer.toBuffer(doc);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename=Ultrasound_Report_${scanId}.docx`);
      res.send(buffer);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).send("Failed to generate document");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Cron job to run daily at 09:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log("Running daily recall check...");
    const fbAdmin = getFirebaseAdmin();
    const db = fbAdmin.firestore();

    try {
      // We need to find patients who are at 19 weeks today.
      // EDD - 147 days = 19 weeks.
      // So EDD = Today + 147 days.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const targetEdd = new Date(today);
      targetEdd.setDate(today.getDate() + 147); 
      
      const targetEddStr = targetEdd.toISOString().split('T')[0];
      console.log(`Searching for patients with EDD around ${targetEddStr} (19 weeks today)`);

      // Query all users
      const usersSnapshot = await db.collection("users").get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const clinicName = userData.clinicProfile?.clinicName || "OGX AI Clinic";
        
        // Query patients for this user
        const patientsSnapshot = await db.collection("users").doc(userDoc.id).collection("patients")
          .where("edd", "==", targetEddStr)
          .get();

        for (const patientDoc of patientsSnapshot.docs) {
          const patient = patientDoc.data();
          if (patient.phoneNumber) {
            console.log(`Found match: ${patient.name} (${patient.phoneNumber})`);
            await sendRecallMessage(
              patient.phoneNumber,
              patient.name,
              "19 weeks 0 days",
              clinicName
            );
          }
        }
      }
    } catch (error) {
      console.error("Cron job error:", error);
    }
  }, {
    timezone: "UTC"
  });
}

startServer();
