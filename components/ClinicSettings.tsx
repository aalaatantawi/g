import React, { useState, useEffect } from 'react';
import { ClinicProfile, saveClinicProfile, uploadClinicLogo } from '../services/firebaseService.ts';

interface ClinicSettingsProps {
  initialProfile?: ClinicProfile;
  onClose: () => void;
  onSave?: (profile: ClinicProfile) => void;
  isDarkMode?: boolean;
}

const ClinicSettings: React.FC<ClinicSettingsProps> = ({ initialProfile, onClose, onSave, isDarkMode }) => {
  const [profile, setProfile] = useState<ClinicProfile>(initialProfile || {
    doctorName: '',
    doctorTitles: '',
    clinicName: '',
    contactInfo: ''
  });
  const [logoFile, setLogoFile] = useState<string | null>(profile.logoUrl || null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      let logoUrl = profile.logoUrl;
      if (logoFile && logoFile.startsWith('data:')) {
        logoUrl = await uploadClinicLogo(logoFile);
      }

      const profileToSave = { 
        ...profile,
        doctorTitles: profile.doctorTitles || ''
      };
      if (logoUrl) {
        profileToSave.logoUrl = logoUrl;
      } else {
        delete profileToSave.logoUrl;
      }

      await saveClinicProfile(profileToSave);
      if (onSave) {
        onSave(profileToSave);
      }
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(onClose, 1500);
    } catch (error) {
      console.error("Error saving clinic profile:", error);
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 border transition-all duration-500 ${
        isDarkMode ? 'bg-[#151518] border-gray-800 shadow-black/40' : 'bg-white border-black/5 shadow-blue-900/5'
      }`}>
        <div className={`p-6 flex justify-between items-center transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-900/50 text-white' : 'bg-[#1C1C1E] text-white'
        }`}>
          <h2 className="text-xl font-black tracking-tight">Clinic Branding Settings</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
          {message && (
            <div className={`p-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
              message.type === 'success' 
                ? (isDarkMode ? 'bg-green-900/20 text-green-400 border border-green-900/50' : 'bg-green-50 text-green-700 border border-green-100') 
                : (isDarkMode ? 'bg-red-900/20 text-red-400 border border-red-900/50' : 'bg-red-50 text-red-700 border border-red-100')
            }`}>
              {message.text}
            </div>
          )}

          <div className="space-y-6">
            <label className="block">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Clinic Logo</span>
              <div className="flex items-center gap-6">
                <div className={`w-24 h-24 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden relative group transition-all duration-300 ${
                  isDarkMode ? 'bg-gray-900 border-gray-800 hover:border-blue-500/50' : 'bg-gray-50 border-gray-200 hover:border-blue-500/50'
                }`}>
                  {logoFile ? (
                    <img src={logoFile} alt="Clinic Logo" className="w-full h-full object-contain" />
                  ) : (
                    <i className="fas fa-image text-gray-300 text-2xl"></i>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <i className="fas fa-camera text-white"></i>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <p className={`mb-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>Upload your clinic logo</p>
                  <p className="opacity-60">Recommended size: 400x400px. PNG or JPG.</p>
                </div>
              </div>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Doctor's Full Name & Titles</label>
                <input 
                  type="text"
                  value={profile.doctorName}
                  onChange={(e) => setProfile({ ...profile, doctorName: e.target.value })}
                  placeholder="e.g., Dr. John Doe, Consultant OBGYN"
                  className={`apple-input w-full px-5 py-4 rounded-2xl border transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${
                    isDarkMode 
                      ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-700 focus:border-blue-500/50' 
                      : 'bg-gray-50 border-gray-100 text-gray-900 placeholder-gray-400 focus:border-blue-500/50'
                  }`}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Clinic Name</label>
                <input 
                  type="text"
                  value={profile.clinicName}
                  onChange={(e) => setProfile({ ...profile, clinicName: e.target.value })}
                  placeholder="e.g., City Women's Health Center"
                  className={`apple-input w-full px-5 py-4 rounded-2xl border transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${
                    isDarkMode 
                      ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-700 focus:border-blue-500/50' 
                      : 'bg-gray-50 border-gray-100 text-gray-900 placeholder-gray-400 focus:border-blue-500/50'
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block">Header/Footer Contact Info</label>
              <textarea 
                value={profile.contactInfo}
                onChange={(e) => setProfile({ ...profile, contactInfo: e.target.value })}
                placeholder="Phone number, Address, WhatsApp, etc."
                className={`apple-input w-full px-5 py-4 rounded-2xl border transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 h-24 resize-none ${
                  isDarkMode 
                    ? 'bg-gray-900 border-gray-800 text-white placeholder-gray-700 focus:border-blue-500/50' 
                    : 'bg-gray-50 border-gray-100 text-gray-900 placeholder-gray-400 focus:border-blue-500/50'
                }`}
                required
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-4 rounded-2xl border font-black uppercase tracking-widest text-[10px] transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white' 
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : null}
              Save Branding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClinicSettings;
