import React from 'react';

export const NetSuiteLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-auto" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="bg-gray-800/70 border border-primary-600/30 rounded-lg p-2 flex items-center">
        <svg viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto">
          <path d="M20 5H5V35H20C28.284 35 35 28.284 35 20C35 11.716 28.284 5 20 5Z" fill="#3498DB" fillOpacity="0.7"/>
          <path d="M45 8H40V32H45V8Z" fill="#E2E8F0"/>
          <path d="M55 8H50V32H55V8Z" fill="#E2E8F0"/>
          <path d="M75 8H60V13H65V32H70V13H75V8Z" fill="#E2E8F0"/>
          <path d="M90 8H77V32H82V24H90C93.866 24 97 20.866 97 17C97 13.134 93.866 10 90 10H87V15H90C91.105 15 92 15.895 92 17C92 18.105 91.105 19 90 19H82V13H90V8Z" fill="#E2E8F0"/>
          <path d="M115 8H100V32H115V27H105V22H115V17H105V13H115V8Z" fill="#E2E8F0"/>
          <path d="M135 8H120V32H125V23H135C138.866 23 142 19.866 142 16C142 12.134 138.866 9 135 9H132V14H135C136.105 14 137 14.895 137 16C137 17.105 136.105 18 135 18H125V13H135V8Z" fill="#E2E8F0"/>
          <path d="M160 8H145V32H150V23H160C163.866 23 167 19.866 167 16C167 12.134 163.866 9 160 9H157V14H160C161.105 14 162 14.895 162 16C162 17.105 161.105 18 160 18H150V13H160V8Z" fill="#E2E8F0"/>
          <path d="M185 8H170V32H185V27H175V22H185V17H175V13H185V8Z" fill="#E2E8F0"/>
        </svg>
        <span className="ml-2 text-primary-400 font-mono text-xs">NETSUITE</span>
      </div>
    </div>
  );
};

export const DynamicsLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-auto" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="bg-gray-800/70 border border-secondary-600/30 rounded-lg p-2 flex items-center">
        <svg viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto">
          <path d="M20 5L5 20L20 35L35 20L20 5Z" fill="#59CBE8" fillOpacity="0.7"/>
          <path d="M45 8H55L65 20L55 32H45L55 20L45 8Z" fill="#E2E8F0"/>
          <path d="M70 8H80L90 20L80 32H70L80 20L70 8Z" fill="#E2E8F0"/>
          <path d="M95 8H105L115 20L105 32H95L105 20L95 8Z" fill="#E2E8F0"/>
          <path d="M120 8H130L140 20L130 32H120L130 20L120 8Z" fill="#E2E8F0"/>
          <path d="M145 8H155L165 20L155 32H145L155 20L145 8Z" fill="#E2E8F0"/>
          <path d="M170 8H180L190 20L180 32H170L180 20L170 8Z" fill="#E2E8F0"/>
        </svg>
        <span className="ml-2 text-secondary-400 font-mono text-xs">DYNAMICS 365</span>
      </div>
    </div>
  );
};

export const SAPLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-auto" }) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="bg-gray-800/70 border border-accent-600/30 rounded-lg p-2 flex items-center">
        <svg viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-auto">
          <path d="M5 8H35V12H5V8Z" fill="#A78BFA" fillOpacity="0.7"/>
          <path d="M5 18H35V22H5V18Z" fill="#A78BFA" fillOpacity="0.7"/>
          <path d="M5 28H35V32H5V28Z" fill="#A78BFA" fillOpacity="0.7"/>
          <path d="M45 8H65V32H60V13H50V32H45V8Z" fill="#E2E8F0"/>
          <path d="M70 8H90C93.866 8 97 11.134 97 15V25C97 28.866 93.866 32 90 32H70V8ZM75 13V27H90C91.105 27 92 26.105 92 25V15C92 13.895 91.105 13 90 13H75Z" fill="#E2E8F0"/>
          <path d="M105 8H125C128.866 8 132 11.134 132 15V25C132 28.866 128.866 32 125 32H105V8ZM110 13V27H125C126.105 27 127 26.105 127 25V15C127 13.895 126.105 13 125 13H110Z" fill="#E2E8F0"/>
          <path d="M140 8H160V13H145V17H155V22H145V27H160V32H140V8Z" fill="#E2E8F0"/>
          <path d="M165 8H185V13H170V17H180V22H170V27H185V32H165V8Z" fill="#E2E8F0"/>
        </svg>
        <span className="ml-2 text-accent-400 font-mono text-xs">SAP B1</span>
      </div>
    </div>
  );
};

export const ERPLogos: React.FC = () => {
  return (
    <div className="flex flex-wrap justify-center gap-4">
      <NetSuiteLogo />
      <DynamicsLogo />
      <SAPLogo />
    </div>
  );
};