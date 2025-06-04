import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  HomeIcon,
  BookOpenIcon,
  ShipIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  BellIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/solid';

// Mock data for demonstration
const vessels = [
  { id: '1', name: 'Northern Star', type: 'cargo', status: 'active', manualCount: 24 },
  { id: '2', name: 'Pacific Explorer', type: 'tanker', status: 'in_maintenance', manualCount: 18 },
  { id: '3', name: 'Atlantic Voyager', type: 'passenger', status: 'active', manualCount: 32 }
];

const recentManuals = [
  { id: '101', title: 'Engine Maintenance Guide', vessel: 'Northern Star', category: 'maintenance', lastViewed: '2025-05-30' },
  { id: '102', title: 'Safety Procedures', vessel: 'Pacific Explorer', category: 'safety', lastViewed: '2025-06-01' },
  { id: '103', title: 'Navigation Systems Manual', vessel: 'Atlantic Voyager', category: 'operation', lastViewed: '2025-06-02' }
];

// Types
interface User {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

// Component for the sidebar navigation
const Sidebar: React.FC<{ isOpen: boolean; toggleSidebar: () => void }> = ({ isOpen, toggleSidebar }) => {
  return (
    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-800 text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <ShipIcon className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold">MarineAI</span>
        </div>
        <button onClick={toggleSidebar} className="md:hidden">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
      
      <nav className="mt-5 px-2">
        <Link to="/" className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-700 rounded-md">
          <HomeIcon className="h-5 w-5 mr-3" />
          Dashboard
        </Link>
        <Link to="/vessels" className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-700 rounded-md">
          <ShipIcon className="h-5 w-5 mr-3" />
          Vessels
        </Link>
        <Link to="/manuals" className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-700 rounded-md">
          <BookOpenIcon className="h-5 w-5 mr-3" />
          Manuals
        </Link>
        <Link to="/assistant" className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-700 rounded-md">
          <ChatBubbleLeftRightIcon className="h-5 w-5 mr-3" />
          AI Assistant
        </Link>
        <Link to="/settings" className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-700 rounded-md">
          <Cog6ToothIcon className="h-5 w-5 mr-3" />
          Settings
        </Link>
      </nav>
      
      <div className="absolute bottom-0 w-full p-4 border-t border-slate-700">
        <Link to="/logout" className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-700 rounded-md">
          <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
          Logout
        </Link>
      </div>
    </div>
  );
};

// Component for the top navigation bar
const TopBar: React.FC<{ toggleSidebar: () => void; user: User }> = ({ toggleSidebar, user }) => {
  return (
    <header className="bg-white shadow-sm z-20 fixed top-0 left-0 right-0 h-16">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="md:hidden mr-4">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search manuals, vessels..."
              className="pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative">
            <BellIcon className="h-6 w-6 text-gray-500" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
          
          <div className="flex items-center space-x-2">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
            ) : (
              <UserCircleIcon className="h-8 w-8 text-gray-500" />
            )}
            <span className="hidden md:inline text-sm font-medium">{user.name}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

// Dashboard component
const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-blue-800">Total Vessels</h3>
            <p className="text-2xl font-bold">{vessels.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-green-800">Active Vessels</h3>
            <p className="text-2xl font-bold">{vessels.filter(v => v.status === 'active').length}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-purple-800">Total Manuals</h3>
            <p className="text-2xl font-bold">{vessels.reduce((sum, vessel) => sum + vessel.manualCount, 0)}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Manuals</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vessel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Viewed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentManuals.map(manual => (
                <tr key={manual.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{manual.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{manual.vessel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      manual.category === 'safety' ? 'bg-red-100 text-red-800' : 
                      manual.category === 'maintenance' ? 'bg-blue-100 text-blue-800' : 
                      'bg-green-100 text-green-800'
                    }`}>
                      {manual.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{manual.lastViewed}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link to={`/manuals/${manual.id}`} className="text-blue-600 hover:text-blue-900 mr-4">View</Link>
                    <Link to={`/assistant?manual=${manual.id}`} className="text-green-600 hover:text-green-900">Ask AI</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Vessels component
const Vessels: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Vessels</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          Add Vessel
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vessels.map(vessel => (
          <div key={vessel.id} className="border rounded-lg overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">{vessel.name}</h3>
              <div className="flex items-center mt-2">
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  vessel.status === 'active' ? 'bg-green-500' : 
                  vessel.status === 'in_maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
                <span className="text-sm text-gray-600">
                  {vessel.status === 'active' ? 'Active' : 
                   vessel.status === 'in_maintenance' ? 'In Maintenance' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Type: {vessel.type}</p>
                  <p className="text-sm text-gray-600">Manuals: {vessel.manualCount}</p>
                </div>
                <Link to={`/vessels/${vessel.id}`} className="text-blue-600 hover:text-blue-900">
                  Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Manuals component placeholder
const Manuals: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-4">Manuals Library</h2>
    <p className="text-gray-500">Browse and search through all vessel manuals.</p>
  </div>
);

// AI Assistant component placeholder
const Assistant: React.FC = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([
    {role: 'assistant', content: 'Hello! I\'m your MarineAI assistant. How can I help you with vessel manuals today?'}
  ]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Add user message to chat
    setChatHistory([...chatHistory, {role: 'user', content: message}]);
    
    // Simulate AI response
    setTimeout(() => {
      setChatHistory(prev => [...prev, {
        role: 'assistant', 
        content: 'I\'ll look that up in the vessel manuals. Based on the documentation, the recommended procedure is to check the main control panel first, then verify the pressure valves are properly set according to section 3.4 of the Engine Maintenance Guide.'
      }]);
    }, 1000);
    
    setMessage('');
  };

  return (
    <div className="bg-white rounded-lg shadow flex flex-col h-[calc(100vh-180px)]">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">AI Assistant</h2>
        <p className="text-sm text-gray-500">Ask questions about your vessel manuals</p>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {chatHistory.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3/4 rounded-lg p-3 ${
              msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask about vessel manuals..."
          />
          <button 
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

// Settings component placeholder
const Settings: React.FC = () => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h2 className="text-xl font-semibold mb-4">Settings</h2>
    <p className="text-gray-500">Configure your MarineAI preferences.</p>
  </div>
);

// Main App component
const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User>({
    name: 'Vitya Petrenko',
    email: 'vitya@marineai.example.com',
    role: 'admin'
  });
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Router>
      <div className="flex h-screen bg-gray-100">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={toggleSidebar}
          ></div>
        )}
        
        <div className="flex-1 flex flex-col md:ml-64">
          <TopBar toggleSidebar={toggleSidebar} user={user} />
          
          <main className="flex-1 p-6 mt-16 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vessels" element={<Vessels />} />
              <Route path="/manuals" element={<Manuals />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <footer className="bg-white p-4 border-t text-center text-sm text-gray-600">
            © 2025 MarineAI Project – Built with ❤️ & robots 🤖
          </footer>
        </div>
      </div>
    </Router>
  );
};

export default App;
