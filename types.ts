
export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AnalysisResult {
  reportMarkdown: string;
  timestamp: string;
  groundingSources?: GroundingSource[];
  scanId?: string;
}

export interface ProcessingState {
  isAnalyzing: boolean;
  progressMessage: string;
  error: string | null;
}

export interface PatientDemographics {
  name: string;
  age: number;
  phoneNumber?: string;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}
