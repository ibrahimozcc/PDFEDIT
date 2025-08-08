import React from 'react';

const Notification = ({ title, message, icon, time, onClose }) => {
  return (
    <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
             <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 mx-3 p-5">
        <div className="flex items-center">
          {/* Sol taraftaki ikon */}
                     <div className={`p-3 rounded-xl mr-3 shadow-lg ${
             icon === 'success' ? 'bg-gradient-to-br from-green-500 to-green-600' :
             icon === 'error' ? 'bg-gradient-to-br from-red-500 to-red-600' :
             icon === 'info' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
             icon === 'add' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
             'bg-gradient-to-br from-red-500 to-red-600'
           }`}>
                         <svg 
               xmlns="http://www.w3.org/2000/svg" 
               width="28" 
               height="28" 
               viewBox="0 0 24 24" 
               fill="none" 
               stroke="currentColor" 
               strokeWidth="2.5" 
               strokeLinecap="round" 
               strokeLinejoin="round" 
               className="text-white"
               style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
             >
                             {icon === 'file' && (
                 <>
                   <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                   <polyline points="14,2 14,8 20,8"></polyline>
                 </>
               )}
               {icon === 'add' && (
                 <>
                   <circle cx="12" cy="12" r="10"></circle>
                   <line x1="12" y1="8" x2="12" y2="16"></line>
                   <line x1="8" y1="12" x2="16" y2="12"></line>
                 </>
               )}
              {icon === 'success' && (
                <>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22,4 12,14.01 9,11.01"></polyline>
                </>
              )}
                             {icon === 'info' && (
                 <>
                   <circle cx="12" cy="12" r="10"></circle>
                   <line x1="12" y1="16" x2="12" y2="12"></line>
                   <line x1="12" y1="8" x2="12.01" y2="8"></line>
                 </>
               )}
               {icon === 'error' && (
                 <>
                   <circle cx="12" cy="12" r="10"></circle>
                   <line x1="15" y1="9" x2="9" y2="15"></line>
                   <line x1="9" y1="9" x2="15" y2="15"></line>
                 </>
               )}
            </svg>
          </div>
          
          {/* Başlık ve mesaj */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-gray-900 truncate">
              {title}
            </h3>
            <p className="text-sm text-gray-600 truncate">
              {message}
            </p>
          </div>
          
          {/* Sağ taraftaki zaman bilgisi */}
          <div className="ml-3 text-xs text-gray-500">
            {time}
          </div>
          
          {/* Kapatma butonu */}
          <button 
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification; 