import React, { useState } from 'react';
import { Building2, LogIn, User } from 'lucide-react';

interface LoginFormProps {
  onLogin: (personalNumber: string, password: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, loading = false, error: authError = null }) => {
  const [personalNumber, setPersonalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  const testDatabaseConnection = async () => {
    setTestingConnection(true);
    try {
      console.log('Testing database connection...');
      const { supabase } = await import('../../lib/supabase');
      
      // Test basic connection
      const { data, error } = await supabase
        .from('users')
        .select('personal_number, name, is_active')
        .limit(5);
      
      console.log('Database test result:', { data, error });
      
      if (error) {
        alert(`Database Error: ${error.message}`);
      } else {
        alert(`Database Connected! Found ${data?.length || 0} users`);
        console.log('Available users:', data);
      }
    } catch (err) {
      console.error('Connection test error:', err);
      alert(`Connection Error: ${err}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const validatePersonalNumber = (number: string): boolean => {
    // Check if it starts with K or T followed by exactly 8 digits
    const pattern = /^[KT]\d{8}$/;
    return pattern.test(number.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    console.log('Form submission:', { personalNumber, password: '***' });

    const upperPersonalNumber = personalNumber.toUpperCase();
    console.log('Uppercase personal number:', upperPersonalNumber);

    if (!validatePersonalNumber(upperPersonalNumber)) {
      setError('Personal number must start with K or T followed by 8 digits (e.g., K12345678)');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      console.log('Calling onLogin...');
      await onLogin(upperPersonalNumber, password);
    } catch (err) {
      console.error('Login error in form:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-[#CC092F]" />
          </div>
          <h1 className="text-2xl font-bold text-black mb-2">IT Asset Manager</h1>
          <p className="text-gray-600">Kenya Revenue Authority</p>
          <p className="text-sm text-gray-500 mt-2">ICT Department Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Number
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={personalNumber}
                onChange={(e) => setPersonalNumber(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                placeholder="K12345678 or T12345678"
                required
                maxLength={9}
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            {authError && (
              <p className="mt-2 text-sm text-red-600">{authError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC092F] focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#CC092F] text-white py-3 rounded-lg hover:bg-[#AA0726] flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Authorized ICT personnel only. All activities are logged and monitored.
          </p>
          <button
            type="button"
            onClick={testDatabaseConnection}
            disabled={testingConnection}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
          >
            {testingConnection ? 'Testing...' : 'Test Database Connection'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;