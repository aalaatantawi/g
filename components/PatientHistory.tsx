import React, { useState, useMemo } from 'react';
import { Patient, Scan } from '../services/firebaseService';

interface PatientHistoryProps {
  patients: Patient[];
  onClose: () => void;
  onSelectPatient: (patient: Patient) => void;
  selectedPatient: Patient | null;
  selectedPatientScans: Scan[];
  onFollowUp: (patient: Patient, previousScan: Scan) => void;
  isDarkMode?: boolean;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({
  patients,
  onClose,
  onSelectPatient,
  selectedPatient,
  selectedPatientScans,
  onFollowUp
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [patients, searchTerm]);

  const filteredScans = useMemo(() => {
    if (!searchTerm) return selectedPatientScans;
    return selectedPatientScans.filter(s => 
      new Date(s.date).toLocaleDateString().includes(searchTerm) ||
      (s.clinicalContext && s.clinicalContext.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [selectedPatientScans, searchTerm]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="rounded-3xl max-w-6xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden border transition-all duration-500 bg-white dark:bg-[#151518] border-black/5 dark:border-gray-800 shadow-blue-900/5 dark:shadow-black/40">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center transition-colors duration-300 bg-[#F2F2F7] dark:bg-gray-900/50 border-black/5 dark:border-gray-800">
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-3 text-[#1C1C1E] dark:text-white">
            <i className="fas fa-folder-open text-blue-500"></i> Patient & Scan History
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
              <input 
                type="text" 
                placeholder="Search name or date..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
              />
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm">
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: Patients List */}
          <div className="w-1/3 border-r overflow-y-auto flex flex-col transition-colors duration-300 bg-white dark:bg-[#151518] border-black/5 dark:border-gray-800">
            <div className="p-4 border-b font-bold text-[10px] uppercase tracking-widest transition-colors duration-300 bg-[#FAFAFA] dark:bg-gray-900/30 border-black/5 dark:border-gray-800 text-[#86868b] dark:text-gray-500">
              Patients Directory ({filteredPatients.length})
            </div>
            {filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center gap-3">
                <i className="fas fa-users text-3xl opacity-20"></i>
                <p>No patients found.</p>
              </div>
            ) : (
              <ul className="divide-y transition-colors duration-300 divide-black/5 dark:divide-gray-800">
                {filteredPatients.map(p => (
                  <li 
                    key={p.id} 
                    onClick={() => onSelectPatient(p)}
                    className={`p-4 cursor-pointer transition-all duration-300 flex justify-between items-center border-l-4 ${
                      selectedPatient?.id === p.id 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-blue-600 dark:border-l-blue-500' 
                        : 'hover:bg-[#F2F2F7] dark:hover:bg-gray-800 border-l-transparent'
                    }`}
                  >
                    <div>
                      <div className="font-bold transition-colors duration-300 text-[#1C1C1E] dark:text-white">{p.name}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">Age: {p.maternalAge}</div>
                    </div>
                    <i className="fas fa-chevron-right text-gray-500 text-xs"></i>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Main Area: Scans for Selected Patient */}
          <div className="w-2/3 overflow-y-auto p-6 transition-colors duration-300 bg-[#FAFAFA] dark:bg-gray-900/20">
            {selectedPatient ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-2xl font-black tracking-tight transition-colors duration-300 text-[#1C1C1E] dark:text-white">{selectedPatient.name}</h4>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Patient Records & Scans</p>
                  </div>
                  <div className="px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-widest shadow-sm transition-colors duration-300 bg-white dark:bg-gray-800 border-black/5 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    Total Scans: {selectedPatientScans.length}
                  </div>
                </div>

                {filteredScans.length === 0 ? (
                  <div className="rounded-2xl border p-12 text-center flex flex-col items-center justify-center transition-colors duration-300 bg-white dark:bg-gray-800/30 border-black/5 dark:border-gray-800">
                    <i className="fas fa-folder-open text-4xl text-gray-500 opacity-30 mb-4"></i>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">No scans found for this patient.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {filteredScans.map((scan, index) => (
                      <div key={scan.id} className="rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 bg-white dark:bg-[#151518] border-black/5 dark:border-gray-800 shadow-blue-900/5 dark:shadow-black/40">
                        <div className="p-4 border-b flex justify-between items-center transition-colors duration-300 bg-[#F2F2F7] dark:bg-gray-900/50 border-black/5 dark:border-gray-800">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              {filteredScans.length - index}
                            </div>
                            <div>
                              <div className="font-bold transition-colors duration-300 text-[#1C1C1E] dark:text-white">{new Date(scan.date).toLocaleString()}</div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{scan.clinicalContext || 'Routine Assessment'}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => onFollowUp(selectedPatient, scan)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                          >
                            <i className="fas fa-plus-circle"></i> Follow-up
                          </button>
                        </div>
                        <div className="p-6">
                          {scan.mediaFiles && scan.mediaFiles.length > 0 && (
                            <div className="flex gap-3 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                              {scan.mediaFiles.map((media, i) => (
                                <div key={i} className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border transition-colors duration-300 bg-gray-50 dark:bg-gray-900 border-black/5 dark:border-gray-800">
                                  {media.startsWith('data:video') || media.includes('video') ? (
                                    <div className="w-full h-full flex items-center justify-center bg-black/10">
                                      <i className="fas fa-video text-gray-400"></i>
                                    </div>
                                  ) : (
                                    <img src={media} alt={`Scan ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="text-sm whitespace-pre-wrap font-mono p-4 rounded-xl border max-h-96 overflow-y-auto transition-colors duration-300 bg-[#FAFAFA] dark:bg-gray-900/50 border-black/5 dark:border-gray-800 text-[#3A3A3C] dark:text-gray-400">
                            {scan.reportMarkdown}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                <i className="fas fa-hand-pointer text-4xl opacity-20 mb-4"></i>
                <p className="font-bold uppercase tracking-widest text-[10px]">Select a patient from the directory</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
