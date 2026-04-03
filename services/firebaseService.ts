import { db, auth, storage } from '../firebase';
import { collection, doc, setDoc, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, where, getDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = true) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (shouldThrow) {
    throw new Error(JSON.stringify(errInfo));
  }
  return errInfo;
}

export interface Patient {
  id?: string;
  name: string;
  maternalAge: number;
  phoneNumber?: string;
  edd?: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Scan {
  id?: string;
  patientId: string;
  date: string;
  clinicalContext: string;
  reportMarkdown: string;
  gaWeeks?: number;
  gaDays?: number;
  edd?: string;
  mediaFiles?: string[];
  ownerId: string;
  createdAt: any;
  updatedAt?: any;
}

export async function savePatient(name: string, maternalAge: number, phoneNumber?: string, edd?: string): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const path = `users/${user.uid}/patients`;
  try {
    // Check if patient already exists for this user
    const q = query(
      collection(db, path),
      where('name', '==', name)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Return existing patient ID and update updatedAt
      const existingDoc = querySnapshot.docs[0];
      const updateData: any = {
        updatedAt: serverTimestamp(),
        maternalAge // update age just in case it changed
      };
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (edd) updateData.edd = edd;

      await updateDoc(doc(db, path, existingDoc.id), updateData);
      return existingDoc.id;
    }

    // Create new patient
    const docRef = await addDoc(collection(db, path), {
      name,
      maternalAge,
      phoneNumber: phoneNumber || '',
      edd: edd || '',
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return null;
  }
}

export async function uploadScanMedia(base64Data: string, scanId: string, index: number, retryCount = 3): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  // Determine extension from base64 data if possible
  let ext = 'png';
  if (base64Data.startsWith('data:image/jpeg')) ext = 'jpg';
  else if (base64Data.startsWith('data:video/mp4')) ext = 'mp4';
  else if (base64Data.startsWith('data:video/quicktime')) ext = 'mov';

  const storageRef = ref(storage, `users/${user.uid}/scans/${scanId}/media_${index}.${ext}`);
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Starting uploadString for media_${index}.${ext}...`);
      const uploadPromise = uploadString(storageRef, base64Data, 'data_url').then(() => {
        console.log(`UploadString finished for media_${index}.${ext}, getting download URL...`);
        return getDownloadURL(storageRef);
      });
      
      // Add a 300 second timeout for larger files (5 minutes)
      console.log(`Waiting for uploadPromise for media_${index}.${ext} with 300s timeout...`);
      return await Promise.race([
        uploadPromise,
        new Promise<string>((_, reject) => setTimeout(() => {
          console.error(`Timeout uploading media_${index}.${ext}`);
          reject(new Error("Timeout uploading media"));
        }, 300000))
      ]);
    } catch (error: any) {
      console.warn(`Upload attempt ${attempt} failed:`, error.message);
      if (attempt === retryCount) {
        console.error("All upload attempts failed.");
        throw error;
      }
      // Wait a bit before retrying (exponential backoff simple version)
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw new Error("Upload failed after multiple attempts");
}

export async function saveScan(
  patientId: string, 
  date: string, 
  clinicalContext: string, 
  reportMarkdown: string,
  gaWeeks?: number,
  gaDays?: number,
  edd?: string,
  mediaFiles?: string[]
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  console.log("Starting saveScan...");
  const path = `users/${user.uid}/scans`;
  try {
    // 1. Create the document first without media to get an ID
    console.log("Creating scan document...");
    const docRef = await addDoc(collection(db, path), {
      patientId,
      date,
      clinicalContext,
      reportMarkdown,
      gaWeeks: gaWeeks || 0,
      gaDays: gaDays || 0,
      edd: edd || '',
      mediaFiles: [], // Start empty
      ownerId: user.uid,
      createdAt: serverTimestamp()
    });
    console.log("Scan document created with ID:", docRef.id);

    const scanId = docRef.id;

    // 2. Upload media files if any
    if (mediaFiles && mediaFiles.length > 0) {
      console.log(`Uploading ${mediaFiles.length} media files...`);
      const urls: string[] = [];
      // Upload sequentially to avoid saturating bandwidth and causing timeouts
      for (let i = 0; i < mediaFiles.length; i++) {
        console.log(`Uploading media file ${i + 1}/${mediaFiles.length}...`);
        const url = await uploadScanMedia(mediaFiles[i], scanId, i);
        console.log(`Media file ${i + 1} uploaded:`, url);
        urls.push(url);
      }
      console.log("All media files uploaded.");

      // 3. Update the document with the URLs
      console.log("Updating scan document with media URLs...");
      await updateDoc(doc(db, path, scanId), {
        mediaFiles: urls
      });
      console.log("Scan document updated.");
    }

    return scanId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return null;
  }
}

export async function updateScan(scanId: string, reportMarkdown: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return false;

  const path = `users/${user.uid}/scans/${scanId}`;
  try {
    await updateDoc(doc(db, `users/${user.uid}/scans`, scanId), {
      reportMarkdown,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    return false;
  }
}

export function subscribeToPatients(callback: (patients: Patient[]) => void) {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }

  const path = `users/${user.uid}/patients`;
  const q = query(
    collection(db, path),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const patients: Patient[] = [];
    snapshot.forEach((doc) => {
      patients.push({ id: doc.id, ...doc.data() } as Patient);
    });
    callback(patients);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path, false);
    callback([]);
  });
}

export function subscribeToScans(patientId: string, callback: (scans: Scan[]) => void) {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => {};
  }

  const path = `users/${user.uid}/scans`;
  const q = query(
    collection(db, path),
    where('patientId', '==', patientId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const scans: Scan[] = [];
    snapshot.forEach((doc) => {
      scans.push({ id: doc.id, ...doc.data() } as Scan);
    });
    callback(scans);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path, false);
    callback([]);
  });
}

import { PRICES } from '../src/billingConfig';

export interface UserSubscription {
  reportsCount: number;
  isPro: boolean;
  clinicProfile?: ClinicProfile;
  hasActiveStripeSub?: boolean;
  tier: 'specialist' | 'consultant' | 'starter';
}

export interface ClinicProfile {
  logoUrl?: string;
  doctorName: string;
  doctorTitles: string;
  clinicName: string;
  contactInfo: string;
}

export async function saveClinicProfile(profile: ClinicProfile, retryCount = 3): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const path = `users/${user.uid}`;
  const docRef = doc(db, path);
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const setDocPromise = setDoc(docRef, {
        clinicProfile: profile
      }, { merge: true });
      
      // Add a 60 second timeout
      await Promise.race([
        setDocPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout saving profile")), 60000))
      ]);
      return; // Success
    } catch (error: any) {
      console.warn(`Save profile attempt ${attempt} failed:`, error.message);
      if (attempt === retryCount) {
        handleFirestoreError(error, OperationType.UPDATE, path);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
}

export async function uploadClinicLogo(base64Data: string, retryCount = 3): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const storageRef = ref(storage, `users/${user.uid}/clinic_logo.png`);
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      // base64Data is expected to be a data URL: data:image/png;base64,xxxx
      const uploadPromise = uploadString(storageRef, base64Data, 'data_url').then(() => getDownloadURL(storageRef));
      
      // Add a 120 second timeout
      return await Promise.race([
        uploadPromise,
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Timeout uploading logo")), 120000))
      ]);
    } catch (error: any) {
      console.warn(`Upload logo attempt ${attempt} failed:`, error.message);
      if (attempt === retryCount) {
        console.error("All logo upload attempts failed.");
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 2000));
    }
  }
  throw new Error("Logo upload failed after multiple attempts");
}

export async function getUserSubscription(): Promise<UserSubscription> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const path = `users/${user.uid}`;
  const docRef = doc(db, path);
  
  let reportsCount = 0;
  let clinicProfile: ClinicProfile | undefined;
  let userDocIsPro = false;
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      reportsCount = docSnap.data().reportsCount || 0;
      clinicProfile = docSnap.data().clinicProfile;
      userDocIsPro = docSnap.data().isPro === true;
    } else {
      // Create the initial document
      await setDoc(docRef, { reportsCount: 0, isPro: false });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }

  let isPro = userDocIsPro || user.email === 'aalaatantawi@gmail.com';
  let hasActiveStripeSub = false;
  let tier: 'specialist' | 'consultant' | 'starter' = 'starter';

  const subsPath = `customers/${user.uid}/subscriptions`;
  try {
    const subsQuery = query(collection(db, subsPath));
    const subsSnap = await getDocs(subsQuery);
    subsSnap.forEach((doc) => {
      const data = doc.data();
      const status = data.status;
      if (status === 'active' || status === 'trialing') {
        isPro = true;
        hasActiveStripeSub = true;
        
        // Determine tier from price ID
        const priceId = data.price?.id || (data.items && data.items[0]?.price?.id);
        if (priceId === PRICES.consultant.monthly || priceId === PRICES.consultant.yearly) {
          tier = 'consultant';
        } else if (priceId === PRICES.specialist.monthly || priceId === PRICES.specialist.yearly) {
          tier = 'specialist';
        }
      }
    });
  } catch (error: any) {
    console.warn("Could not read subscriptions, defaulting to Free:", error.message);
  }

  return { reportsCount, isPro, clinicProfile, hasActiveStripeSub, tier };
}

export function subscribeToUserSubscription(callback: (sub: UserSubscription) => void): () => void {
  const user = auth.currentUser;
  if (!user) return () => {};

  const userPath = `users/${user.uid}`;
  const userDocRef = doc(db, userPath);
  
  const subsPath = `customers/${user.uid}/subscriptions`;
  const subsQuery = query(collection(db, subsPath));

  let currentReportsCount = 0;
  let currentIsPro = user.email === 'aalaatantawi@gmail.com';
  let currentClinicProfile: ClinicProfile | undefined;
  let userDocIsPro = false;
  let hasActiveSub = false;
  let currentTier: 'specialist' | 'consultant' | 'starter' = 'starter';

  const emit = () => {
    callback({ 
      reportsCount: currentReportsCount, 
      isPro: currentIsPro || userDocIsPro || hasActiveSub, 
      clinicProfile: currentClinicProfile,
      hasActiveStripeSub: hasActiveSub,
      tier: currentTier
    });
  };

  const unsubUser = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      currentReportsCount = docSnap.data().reportsCount || 0;
      currentClinicProfile = docSnap.data().clinicProfile;
      userDocIsPro = docSnap.data().isPro === true;
    } else {
      currentReportsCount = 0;
      currentClinicProfile = undefined;
      userDocIsPro = false;
    }
    emit();
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, userPath, false);
  });

  const unsubSubs = onSnapshot(subsQuery, (snapshot) => {
    hasActiveSub = false;
    currentTier = 'starter';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.status;
      if (status === 'active' || status === 'trialing') {
        hasActiveSub = true;
        
        // Determine tier from price ID
        const priceId = data.price?.id || (data.items && data.items[0]?.price?.id);
        if (priceId === PRICES.consultant.monthly || priceId === PRICES.consultant.yearly) {
          currentTier = 'consultant';
        } else if (priceId === PRICES.specialist.monthly || priceId === PRICES.specialist.yearly) {
          currentTier = 'specialist';
        }
      }
    });
    emit();
  }, (error: any) => {
    console.warn("Could not subscribe to subscriptions, defaulting to Free:", error.message);
    hasActiveSub = false;
    currentTier = 'starter';
    emit();
  });

  return () => {
    unsubUser();
    unsubSubs();
  };
}

export async function incrementReportCount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  const path = `users/${user.uid}`;
  const docRef = doc(db, path);
  
  try {
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, { reportsCount: 1, isPro: false });
    } else {
      await updateDoc(docRef, {
        reportsCount: increment(1)
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
    throw error;
  }
}
