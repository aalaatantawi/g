import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { analyzeUltrasound, analyzeUltrasoundVideo, refineReport, extractClinicalData } from './services/geminiService.ts';
import { AnalysisResult, ProcessingState } from './types.ts';
import Header from './components/Header.tsx';
import ImageUploader from './components/ImageUploader.tsx';
import ReportDisplay from './components/ReportDisplay.tsx';
import LoadingOverlay from './components/LoadingOverlay.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import VoiceAssistant, { VoiceAssistantHandle } from './components/VoiceAssistant.tsx';
import { auth, logout, db } from './firebase.ts';
import { onAuthStateChanged } from 'firebase/auth';
import { savePatient, saveScan, updateScan, subscribeToPatients, subscribeToScans, Patient, Scan, getUserSubscription, subscribeToUserSubscription, incrementReportCount, handleFirestoreError, OperationType } from './services/firebaseService.ts';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import AuthScreen from './components/AuthScreen.tsx';
import { PatientHistory } from './components/PatientHistory.tsx';
import ClinicSettings from './components/ClinicSettings.tsx';
import SuccessPage from './src/components/SuccessPage.tsx';
import FailurePage from './src/components/FailurePage.tsx';
import { successUrl, cancelUrl, PRICES } from './src/billingConfig.ts';
import { SubscriptionTiers } from './components/SubscriptionTiers.tsx';

const App: React.FC = () => {
  const [mediaFiles, setMediaFiles] = useState<{ data: string; type: 'image' | 'video' }[]>([]);
  const [clinicalContext, setClinicalContext] = useState('');
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [maternalAge, setMaternalAge] = useState<number>(30);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [scanStatus, setScanStatus] = useState<'normal' | 'abnormal'>('normal');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [previousScan, setPreviousScan] = useState<Scan | null>(null);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);
  const [currentPatientId, setCurrentPatientId] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingState>({
    isAnalyzing: false,
    progressMessage: '',
    error: null,
  });

  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showClinicSettings, setShowClinicSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showUpgradeChoice, setShowUpgradeChoice] = useState(false);
  const [selectedPatientScans, setSelectedPatientScans] = useState<Scan[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [userSub, setUserSub] = useState<any>(null);
  const [isManagingSub, setIsManagingSub] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

  const voiceAssistantRef = useRef<VoiceAssistantHandle>(null);

  const handleVoiceCommand = (command: string, args: any) => {
    if (command === 'finish_report') {
      console.log("Finish report command received");
      handleGenerateReport();
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setIsManagingSub(true);
    try {
      const portalSessionsRef = collection(db, 'customers', user.uid, 'portal_sessions');
      const docRef = await addDoc(portalSessionsRef, {
        return_url: window.location.origin
      });
      
      let timeoutId: NodeJS.Timeout;
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data();
        if (data?.url) {
          clearTimeout(timeoutId);
          unsubscribe();
          window.location.href = data.url;
        }
      }, (error) => {
        console.error("Portal session snapshot error:", error);
        unsubscribe();
        clearTimeout(timeoutId);
        setIsManagingSub(false);
        alert("An error occurred while loading the portal. Please try again.");
      });

      timeoutId = setTimeout(() => {
        unsubscribe();
        setIsManagingSub(false);
        alert("Could not load subscription portal. Please try again.");
      }, 20000);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `customers/${user.uid}/portal_sessions`);
      setIsManagingSub(false);
      alert("An error occurred. Please try again.");
    }
  };

  const handleCheckout = async (tier: 'consultant' | 'enterprise', plan: 'monthly' | 'yearly' = 'monthly') => {
    if (!user) {
      alert("User not logged in");
      return;
    }
    setIsCheckingOut(`${tier}-${plan}`);
    console.log("Attempting checkout for user:", user.uid);
    try {
      const priceId = PRICES[tier][plan];
      const checkoutSessionsRef = collection(db, 'customers', user.uid, 'checkout_sessions');
      console.log("Checkout sessions ref path:", checkoutSessionsRef.path);
      const docRef = await addDoc(checkoutSessionsRef, {
        price: priceId,
        mode: 'subscription',
        success_url: successUrl(),
        cancel_url: cancelUrl(),
      });
      console.log("Checkout session created:", docRef.id);

      let timeoutId: NodeJS.Timeout;
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const data = snap.data();
        if (data?.error) {
          unsubscribe();
          clearTimeout(timeoutId);
          setIsCheckingOut(null);
          alert(`An error occurred: ${data.error.message}`);
        }
        if (data?.url) {
          unsubscribe();
          clearTimeout(timeoutId);
          window.location.href = data.url;
        }
      }, (error) => {
        console.error("Checkout session snapshot error:", error);
        unsubscribe();
        clearTimeout(timeoutId);
        setIsCheckingOut(null);
        alert("An error occurred while loading checkout. Please try again.");
      });

      timeoutId = setTimeout(() => {
        unsubscribe();
        setIsCheckingOut(null);
        alert("Could not load checkout. Please try again.");
      }, 20000);
    } catch (e: any) {
      handleFirestoreError(e, OperationType.WRITE, `customers/${user.uid}/checkout_sessions`);
      setIsCheckingOut(null);
      alert("Checkout error: " + e.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribePatients = subscribeToPatients((data) => setPatients(data));
      const unsubscribeSub = subscribeToUserSubscription((sub) => setUserSub(sub));
      return () => {
        unsubscribePatients();
        unsubscribeSub();
      };
    } else {
      setPatients([]);
      setUserSub(null);
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatient) {
      const unsubscribe = subscribeToScans(selectedPatient.id!, (data) => setSelectedPatientScans(data));
      return () => unsubscribe();
    } else {
      setSelectedPatientScans([]);
    }
  }, [selectedPatient]);

  const handleGenerateReport = async () => {
    if (mediaFiles.length === 0) return;

    setStatus({ isAnalyzing: true, progressMessage: 'Digitizing Imaging Data...', error: null });
    
    let currentPatientName = patientName;
    let currentMaternalAge = maternalAge;
    let currentClinicalContext = clinicalContext;
    let currentExtractedData = extractedData;

    try {
      // 1. Extract Data from images if any
      const imageFiles = mediaFiles.filter(f => f.type === 'image');
      if (imageFiles.length > 0) {
        setStatus(s => ({ ...s, progressMessage: 'Extracting Clinical Data...' }));
        const data = await extractClinicalData(imageFiles.map(img => img.data.split(',')[1]));
        currentExtractedData = data;
        setExtractedData(data);
        
        if (data) {
          if (data.patient_info) {
            if (data.patient_info.name && data.patient_info.name !== "...") {
              currentPatientName = data.patient_info.name;
              setPatientName(data.patient_info.name);
            }
            if (data.patient_info.age && data.patient_info.age !== "...") {
              currentMaternalAge = parseInt(data.patient_info.age) || 30;
              setMaternalAge(currentMaternalAge);
            }
          }
          
          if (data.biometry && typeof data.biometry === 'object') {
            let summary = "Extracted Biometry:\n";
            Object.entries(data.biometry).forEach(([key, val]: [string, any]) => {
              if (val && typeof val === 'object' && val.value && val.value !== "...") {
                summary += `${key}: ${val.value}${val.unit || ''} (p${val.percentile || '?'})\n`;
              }
            });
            currentClinicalContext = currentClinicalContext ? currentClinicalContext + "\n\n" + summary : summary;
            setClinicalContext(currentClinicalContext);
          }
        }
      }

      // 2. Generate Report
      setStatus(s => ({ ...s, progressMessage: 'Initiating Specialist Protocol...' }));
      console.log("Generating report...");
      
      let result;
      const videoFile = mediaFiles.find(f => f.type === 'video');
      
      if (videoFile) {
        console.log("Analyzing video...");
        const mimeType = videoFile.data.split(';')[0].split(':')[1];
        const base64 = videoFile.data.split(',')[1];
        result = await analyzeUltrasoundVideo(
          base64,
          mimeType,
          currentClinicalContext,
          currentPatientName,
          currentMaternalAge,
          scanStatus,
          doctorNotes
        );
      } else {
        console.log("Analyzing images...");
        result = await analyzeUltrasound(
          mediaFiles.map(img => img.data.split(',')[1]),
          currentClinicalContext,
          currentPatientName,
          currentMaternalAge,
          previousScan?.reportMarkdown,
          scanStatus,
          doctorNotes
        );
      }
      console.log("Report generated.");
      
      setAnalysis({ 
        reportMarkdown: result.reportMarkdown, 
        timestamp: new Date().toLocaleString(),
        groundingSources: result.groundingSources
      });
      
      if (user) {
        await incrementReportCount();
        const finalPatientName = currentPatientName.trim() || 'Anonymous Patient';
        
        // Normalize EDD if possible
        let normalizedEdd = currentExtractedData?.patient_info?.edd || '';
        if (normalizedEdd && normalizedEdd !== "...") {
          try {
            const d = new Date(normalizedEdd);
            if (!isNaN(d.getTime())) {
              normalizedEdd = d.toISOString().split('T')[0];
            }
          } catch (e) {}
        }

        console.log("Saving patient...");
        const pId = await savePatient(finalPatientName, currentMaternalAge, phoneNumber, normalizedEdd);
        if (pId) {
          setCurrentPatientId(pId);
          setStatus(s => ({ ...s, progressMessage: 'Archiving Scan Data & Media...' }));
          console.log("Saving scan...");
          const scanId = await saveScan(
            pId, 
            new Date().toISOString(), 
            currentClinicalContext, 
            result.reportMarkdown,
            parseInt(currentExtractedData?.patient_info?.ga_weeks) || 0,
            parseInt(currentExtractedData?.patient_info?.ga_days) || 0,
            normalizedEdd,
            mediaFiles.map(f => f.data)
          );
          console.log("Scan saved:", scanId);
          if (scanId) {
            setCurrentScanId(scanId);
          }
        }
      }

      setStatus({ isAnalyzing: false, progressMessage: '', error: null });
      setPreviousScan(null);
    } catch (err: any) {
      console.error("Clinical error:", err);
      let errorMessage = err.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Diagnostic cycle interrupted.';
      setStatus({ isAnalyzing: false, progressMessage: '', error: errorMessage });
    } finally {
      setStatus(s => ({ ...s, isAnalyzing: false }));
    }
  };

  const onUpdateReport = async (comment: string) => {
    if (!analysis) return;

    setIsRefining(true);
    try {
      const result = await refineReport(
        mediaFiles.filter(f => f.type === 'image').map(img => img.data.split(',')[1]),
        analysis.reportMarkdown,
        comment,
        clinicalContext,
        patientName,
        maternalAge,
        scanStatus,
        doctorNotes
      );
      setAnalysis({ 
        ...analysis, 
        reportMarkdown: result.reportMarkdown, 
        timestamp: new Date().toLocaleString() + " (Updated)",
        groundingSources: result.groundingSources
      });

      if (user && currentScanId) {
        await updateScan(currentScanId, result.reportMarkdown);
      }
    } catch (err: any) {
      let errorMessage = err.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Refinement rejected by model.';
      
      setStatus(s => ({ ...s, error: errorMessage }));
    } finally {
      setIsRefining(false);
    }
  };

  const resetSession = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setMediaFiles([]);
    setClinicalContext('');
    setPatientName('');
    setMaternalAge(30);
    setScanStatus('normal');
    setDoctorNotes('');
    setAnalysis(null);
    setPreviousScan(null);
    setCurrentScanId(null);
    setCurrentPatientId(null);
    setIsRefining(false);
    setStatus({
      isAnalyzing: false,
      progressMessage: '',
      error: null,
    });
    setShowResetConfirm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">Loading...</div>;
  }

  const isUnverified = user && !user.emailVerified && user.providerData?.some((p: any) => p.providerId === 'password');

  if (window.location.pathname === '/success') {
    return <SuccessPage user={user} />;
  }

  if (window.location.pathname === '/failure') {
    return <FailurePage />;
  }

  if (!user || isUnverified) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#121212] transition-colors">
      <Header />
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex-grow container mx-auto px-6 py-12 md:py-20 max-w-[1100px]"
      >
        {/* Auth & History Bar */}
        <div className="flex flex-wrap justify-between items-center mb-12 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-black/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600">
              <i className="fas fa-user-md"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1C1C1E]">Dr. {user.displayName || user.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                {userSub?.isPro ? (
                  <span className="text-blue-600 font-semibold"><i className="fas fa-check-circle text-[10px]"></i> Pro Plan</span>
                ) : (
                  <span>Free Plan</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userSub?.isPro ? (
              <>
                <button 
                  type="button"
                  onClick={() => setShowClinicSettings(true)}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-[#1C1C1E] transition-colors"
                >
                  <i className="fas fa-id-card mr-2 hidden sm:inline"></i> Branding
                </button>
                {userSub?.hasActiveStripeSub && (
                  <button 
                    type="button"
                    onClick={handleManageSubscription}
                    disabled={isManagingSub}
                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-[#1C1C1E] transition-colors disabled:opacity-50"
                  >
                    <i className="fas fa-cog mr-2 hidden sm:inline"></i> {isManagingSub ? '...' : 'Subscription'}
                  </button>
                )}
              </>
            ) : (
              <button 
                type="button"
                onClick={() => setShowPaywall(true)}
                className="px-4 py-2 bg-[#E6192B] text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors shadow-sm"
              >
                <i className="fas fa-crown mr-2"></i> Upgrade
              </button>
            )}
            <button 
              type="button"
              onClick={() => setShowHistory(true)}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-[#1C1C1E] transition-colors"
            >
              <i className="fas fa-folder-open mr-2 hidden sm:inline"></i> History
            </button>
            <button 
              type="button"
              onClick={logout}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xs font-semibold text-red-600 transition-colors"
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>

        {/* Hero Section */}
        {!analysis && (
          <div className="text-center mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
             <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#1C1C1E] leading-tight">
               Capture or upload photos and patient information
             </h2>
          </div>
        )}

        <div className={`grid grid-cols-1 ${analysis ? 'lg:grid-cols-12' : 'lg:grid-cols-1 max-w-4xl mx-auto w-full'} gap-8 items-start`}>
          {/* Main Input Card */}
          <section className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-xl p-6 md:p-8 border border-black/5 dark:border-white/10 transition-all lg:col-span-1">
            {previousScan && (
              <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex items-start gap-3">
                <i className="fas fa-history text-blue-600 dark:text-blue-400 mt-1"></i>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Follow-up Scan Mode</h4>
                  <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                    Comparing with previous scan from {new Date(previousScan.date).toLocaleDateString()}.
                    The AI will automatically highlight changes in biometry and anatomy.
                  </p>
                </div>
                <button 
                  onClick={() => setPreviousScan(null)}
                  className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline whitespace-nowrap"
                >
                  Clear Comparison
                </button>
              </div>
            )}
            <div className="space-y-8">
              <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl p-6 md:p-8 shadow-sm border border-black/5 dark:border-white/10">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-[#1C1C1E] dark:text-white mb-2">Upload Ultrasound Images</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                    Optional: Upload an ultrasound image with patient details and measurements (camera shot or upload), or enter them manually.
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  <ImageUploader onFilesChange={(files) => { setMediaFiles(files); setStatus(s => ({ ...s, error: null })); }} files={mediaFiles} disabled={status.isAnalyzing} />
                </div>

                {/* Ultrasound Case Assessment Section */}
                <div className="mt-8 pt-8 border-t border-black/5">
                  <button
                    onClick={() => voiceAssistantRef.current?.startSession()}
                    className="w-full mb-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fas fa-microphone"></i> Start Voice Dictation
                  </button>
                  <h3 className="text-sm font-bold text-[#1C1C1E] mb-4 uppercase tracking-wider">Ultrasound Case Assessment</h3>
                  <div className="flex gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => setScanStatus('normal')}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        scanStatus === 'normal' 
                          ? 'bg-green-600 text-white shadow-md ring-2 ring-green-600 ring-offset-2' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                      disabled={status.isAnalyzing}
                    >
                      <i className="fas fa-check-circle"></i> Normal Scan
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanStatus('abnormal')}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        scanStatus === 'abnormal' 
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-600 ring-offset-2' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                      disabled={status.isAnalyzing}
                    >
                      <i className="fas fa-exclamation-circle"></i> Abnormal Findings
                    </button>
                  </div>

                  {scanStatus === 'abnormal' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 block">Doctor's Suspicions / Observations</label>
                      <textarea
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                        placeholder="Describe the suspected pathology or specific findings you want the AI to analyze..."
                        className="apple-input min-h-[100px] border-red-100 focus:border-red-300"
                        disabled={status.isAnalyzing}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
                <h3 className="text-sm font-bold text-[#1C1C1E] mb-4 uppercase tracking-wider">Manual Details (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 block">Patient Identification</label>
                    <input 
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Name or ID"
                      className="apple-input"
                      disabled={status.isAnalyzing}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 block">Phone Number</label>
                    <input 
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="e.g. +1234567890"
                      className="apple-input"
                      disabled={status.isAnalyzing}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 block">Maternal Age</label>
                    <input 
                      type="number"
                      value={maternalAge}
                      onChange={(e) => setMaternalAge(parseInt(e.target.value) || 30)}
                      className="apple-input"
                      disabled={status.isAnalyzing}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 block">Clinical Context</label>
                  <textarea
                    value={clinicalContext}
                    onChange={(e) => setClinicalContext(e.target.value)}
                    placeholder="Enter relevant clinical history, symptoms, or specific questions for the AI..."
                    className="apple-input min-h-[100px] resize-y"
                    disabled={status.isAnalyzing}
                  />
                </div>
              </div>
            </div>
            
            {mediaFiles.length > 0 && !analysis && (
              <div className="mt-12 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  disabled={status.isAnalyzing}
                  className="w-full md:w-auto py-4 px-12 rounded-full bg-[#E6192B] text-white font-bold tracking-wide hover:bg-[#C41524] hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none text-lg flex items-center justify-center gap-3"
                >
                  {status.isAnalyzing ? (
                    <><i className="fas fa-circle-notch fa-spin"></i> {status.progressMessage || 'Processing Protocol...'}</>
                  ) : (
                    <><i className="fas fa-file-medical"></i> Auto-Extract & Generate Report</>
                  )}
                </button>
              </div>
            )}
          </section>

          {/* Report Display Section */}
          {analysis && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-8"
            >
              <ReportDisplay 
                analysis={analysis} 
                onUpdate={onUpdateReport} 
                isUpdating={isRefining} 
                onReset={resetSession} 
                userSub={userSub}
                userId={user?.uid}
                patientId={currentPatientId || selectedPatient?.id}
                scanId={currentScanId}
              />
            </motion.div>
          )}
          
          {!userSub?.isPro && !status.isAnalyzing && !analysis && (
            <div className={`mt-10 pb-8 ${analysis ? 'lg:col-span-12' : 'lg:col-span-1'}`}>
              <SubscriptionTiers onCheckout={handleCheckout} isCheckingOut={isCheckingOut} />
            </div>
          )}

          {status.error && (
            <div className={`apple-card p-6 border text-sm font-medium mt-8 ${analysis ? 'lg:col-span-12' : 'lg:col-span-1'} ${status.error.includes('INVALID_KEY_FORMAT') ? 'bg-red-600 border-red-700 text-white shadow-2xl scale-105 transform transition-all' : 'bg-red-50 border-red-100 text-red-600'}`}>
              <div className="flex items-start gap-3">
                <i className={`fas fa-exclamation-triangle mt-1 ${status.error.includes('INVALID_KEY_FORMAT') ? 'text-white text-2xl' : ''}`}></i>
                <div>
                  {status.error.includes('INVALID_KEY_FORMAT') ? (
                    <div className="space-y-2">
                      <h3 className="text-xl font-black uppercase tracking-wider mb-2">🚨 CRITICAL ERROR: WRONG API KEY 🚨</h3>
                      <p className="text-base font-bold">You have pasted a Firebase key instead of a Gemini API key in the Settings.</p>
                      <ol className="list-decimal ml-5 space-y-2 mt-4 font-semibold">
                        <li>Look at the top right corner of this screen.</li>
                        <li>Click on the <strong>Gear Icon (Settings)</strong> or <strong>Secrets</strong>.</li>
                        <li>Find the variable named <strong>GEMINI_API_KEY</strong>.</li>
                        <li>Click the <strong>Trash Can (Delete)</strong> icon next to it.</li>
                        <li>Close the settings and try again. <strong>DO NOT add a new key.</strong></li>
                      </ol>
                    </div>
                  ) : (
                    status.error
                  )}
                </div>
              </div>
            </div>
          )}
          
          {status.isAnalyzing && (
            <div className={analysis ? 'lg:col-span-12' : 'lg:col-span-1'}>
              <LoadingOverlay message={status.progressMessage} />
            </div>
          )}
        </div>
      </motion.main>

      {showHistory && (
        <PatientHistory
          patients={patients}
          selectedPatient={selectedPatient}
          selectedPatientScans={selectedPatientScans}
          onSelectPatient={setSelectedPatient}
          onClose={() => setShowHistory(false)}
          onFollowUp={(patient, scan) => {
            setPatientName(patient.name);
            setMaternalAge(patient.maternalAge);
            setPreviousScan(scan);
            setShowHistory(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* Clinic Settings Modal */}
      {showClinicSettings && (
        <ClinicSettings 
          onClose={() => setShowClinicSettings(false)} 
          initialProfile={userSub?.clinicProfile}
          onSave={(newProfile) => {
            if (userSub) {
              setUserSub({ ...userSub, clinicProfile: newProfile });
            }
          }}
        />
      )}

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="text-[#E6192B] text-5xl mb-4">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="text-xl font-bold text-[#1C1C1E] mb-2">End Session?</h3>
            <p className="text-[#86868b] text-sm mb-6">This will clear all current patient data and media. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 px-4 bg-[#E5E5EA] text-[#1C1C1E] rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-[#D1D1D6] transition-colors">Cancel</button>
              <button onClick={confirmReset} className="flex-1 py-3 px-4 bg-[#E6192B] text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-[#C81625] transition-colors">End Session</button>
            </div>
          </div>
        </div>
      )}

      {showPaywall && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 my-8 relative overflow-hidden">
            <button 
              onClick={() => {
                setShowPaywall(false);
                setShowUpgradeChoice(false);
              }} 
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-20 backdrop-blur-md"
            >
              <i className="fas fa-times text-xl"></i>
            </button>

            <div className="bg-[#1C1C1E] text-[#F5F5F7] p-8 md:p-12 text-center relative overflow-hidden border-b border-black/10">
              <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3 relative z-10 text-white">
                Great! You just saved 15 minutes and got a flawless ultrasound report...
              </h2>
              <h3 className="text-xl md:text-2xl font-bold text-[#E6192B] mt-4 relative z-10">
                but this is just the beginning.
              </h3>
            </div>

            <div className="p-8 md:p-12 bg-[#FAFAFA]">
              <div className="prose prose-lg max-w-none text-[#1C1C1E] mb-10 leading-relaxed">
                <p>As OB/GYNs, we went to medical school to treat patients—not to act as data-entry clerks, manually calculating IOTA scores or searching for Hadlock tables while the waiting room overflows.</p>
                <p>Enter <strong className="text-[#E6192B]">OGX AI Pro</strong>: the ultimate "super-assistant" built specifically for the fast-paced rhythm of our clinics.</p>
              </div>

              <div className="bg-white rounded-2xl p-6 md:p-8 mb-10 border border-black/10 shadow-sm">
                <h3 className="text-lg font-bold text-[#E6192B] mb-6 uppercase tracking-wider">Here is what you unlock the moment you upgrade today:</h3>
                <ul className="space-y-6">
                  <li className="flex items-start gap-4">
                    <span className="text-2xl mt-1">🔓</span>
                    <div>
                      <strong className="text-[#1C1C1E] block text-lg mb-1">Unlimited Reports</strong> 
                      <span className="text-gray-600">Snap and generate instant reports with zero restrictions or "out of credits" warnings.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-2xl mt-1">⚙️</span>
                    <div>
                      <strong className="text-[#1C1C1E] block text-lg mb-1">The Ultimate Auto-Calculator Suite</strong> 
                      <span className="text-gray-600 block mb-3">Never manually calculate a score again. OGX AI automatically extracts your measurements and instantly computes:</span>
                      
                      <div className="grid md:grid-cols-2 gap-4 mt-2">
                        <div className="bg-[#FAFAFA] p-4 rounded-xl border border-black/5">
                          <strong className="text-sm text-[#E6192B] block mb-2 uppercase tracking-wide">Obstetrics & Fetal Medicine:</strong>
                          <ul className="text-sm text-[#1C1C1E] space-y-1.5 list-disc pl-4">
                            <li>Estimated Fetal Weight (EFW) & Exact Percentiles (Hadlock).</li>
                            <li>Gestational Age (GA) & EDD by Ultrasound Biometry.</li>
                            <li>Doppler Indices (PI, RI) for UA, MCA, UtA, and Ductus Venosus.</li>
                            <li>Cerebroplacental Ratio (CPR) for Hypoxia Risk.</li>
                            <li>Amniotic Fluid Index (AFI) & Single Deepest Pocket (SDP).</li>
                            <li>Fetal Growth Restriction (FGR/IUGR) Assessment.</li>
                          </ul>
                        </div>
                        <div className="bg-[#FAFAFA] p-4 rounded-xl border border-black/5">
                          <strong className="text-sm text-[#E6192B] block mb-2 uppercase tracking-wide">Gynecology & Pelvic Scans:</strong>
                          <ul className="text-sm text-[#1C1C1E] space-y-1.5 list-disc pl-4">
                            <li>IOTA Simple Rules & ADNEX Model (Ovarian Tumors).</li>
                            <li>O-RADS Risk Stratification.</li>
                            <li>MUSA Criteria, Myoma Volume & Mapping (Fibroids/Adenomyosis).</li>
                            <li>IETA Scoring (Endometrial Assessment).</li>
                            <li>Ovarian Volume & Antral Follicle Count (AFC for PCOS).</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-2xl mt-1">🖨️</span>
                    <div>
                      <strong className="text-[#1C1C1E] block text-lg mb-1">Print, Export & Share</strong> 
                      <span className="text-gray-600">Instantly print your reports, export them to Word/PDF, or send them directly to your patient's WhatsApp in seconds.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-2xl mt-1">📊</span>
                    <div>
                      <strong className="text-[#1C1C1E] block text-lg mb-1">Patient Smart Tracking</strong> 
                      <span className="text-gray-600">Keep and follow up patient histories in one secure place.</span>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="mb-10 text-[#1C1C1E] text-lg">
                <div className="bg-[#FFF0F0] border-l-4 border-[#E6192B] p-6 rounded-r-xl shadow-sm mb-6">
                  <p className="text-lg font-bold text-[#1C1C1E] m-0">
                    Upgrading to OGX AI Pro costs less than the price of a single ultrasound scan per month! The rest of the month, the app works for you, increasing your profit margins and buying back hours of your time every single day.
                  </p>
                </div>
                <p className="text-base font-medium text-gray-600 max-w-2xl mx-auto text-center">
                  Because your time is measured in gold, we've eliminated complicated sign-ups. No need to dig out your credit card. You are exactly one click away from transforming your clinic.
                </p>
              </div>

              <SubscriptionTiers onCheckout={handleCheckout} isCheckingOut={isCheckingOut} />
            </div>
          </div>
        </div>
      )}

          {/* Patient History Modal */}
      <VoiceAssistant ref={voiceAssistantRef} onCommand={handleVoiceCommand} />

      <footer className="py-12 border-t border-black/5 text-center">
        <p className="text-[11px] text-[#86868b] font-medium tracking-tight">
          © 2024 OGXAI Systems. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default App;