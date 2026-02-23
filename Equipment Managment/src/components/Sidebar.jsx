import React from 'react';

const navItems = [
  { id: 'dashboard', label: 'Powiadomienia', icon: DashboardIcon },
  { id: 'items', label: 'Baza danych', icon: DatabaseIcon },
  { id: 'settings', label: 'Ustawienia', icon: SettingsIcon },
];

export default React.memo(function Sidebar({ currentPage, onNavigate, darkMode, children, onBackToProfile }) {
  return (
    <aside className={`w-64 border-r flex flex-col shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-border'}`}>
      <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-border'}`}>
        <h1 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
          <span className="text-2xl">🔧</span>
          <span>Equipment<br/>Manager</span>
        </h1>
      </div>
      {children}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : darkMode
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <item.icon active={isActive} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onBackToProfile}
          className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
            darkMode
              ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          🗂️ Zmień profil
        </button>
      </div>
      <div className={`p-4 border-t text-xs text-center ${darkMode ? 'border-gray-700 text-gray-500' : 'border-border text-gray-400'}`}>
        v2.0.0
      </div>
    </aside>
  );
})

function DashboardIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={active ? 'white' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function DatabaseIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={active ? 'white' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 3.6 3 8 3s8-1 8-3V7M4 7c0 2 3.6 3 8 3s8-1 8-3M4 7c0-2 3.6-3 8-3s8 1 8 3m0 5c0 2-3.6 3-8 3s-8-1-8-3" />
    </svg>
  );
}

function SettingsIcon({ active }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={active ? 'white' : 'currentColor'} strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
