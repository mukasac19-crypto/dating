'use client';

import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { useEffect, useState, FormEvent } from 'react';
import toast from 'react-hot-toast';
import { Database } from '@/types/supabase';
import { useRouter } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';

type Profile = Database['public']['Tables']['profiles']['Row'];

// ... (DeleteConfirmationModal code stays exactly the same) ...
const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, isDeleting }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, isDeleting: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold text-gray-900">Are you sure?</h2>
        <p className="text-gray-600 mt-2">
          This action is irreversible. All of your data, including chat history and analysis results, will be permanently deleted.
        </p>
        <div className="mt-6 flex justify-end space-x-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          toast.error('Could not fetch your profile.');
          console.error(error);
        } else {
          setProfile(profileData);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const username = formData.get('username') as string;

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, username: username })
      .eq('id', user.id);

    if (error) {
      toast.error(error.message);
    } else {
      setProfile(prev => prev ? { ...prev, full_name: fullName, username } : null);
      toast.success('Profile updated successfully!');
    }
    setIsUpdating(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const response = await fetch('/api/user', {
      method: 'DELETE',
    });

    if (response.ok) {
      toast.success('Account deleted successfully.');
      await supabase.auth.signOut();
      router.push('/login');
    } else {
      const { error } = await response.json();
      toast.error(error || 'Failed to delete account.');
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsRedirectingToStripe(true);
    try {
      const response = await fetch('/api/stripe/manage', {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to initiate subscription.');
        setIsRedirectingToStripe(false);
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong.');
      setIsRedirectingToStripe(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-12 text-center text-red-500">Could not load profile. Please try again later.</div>;
  }
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-1">Manage your account and subscription settings.</p>
        </div>
        <SignOutButton />
      </div>

      {/* Profile Form */}
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200 mb-8">
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <p className="text-lg text-gray-500 mt-1">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                defaultValue={profile?.full_name || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                defaultValue={profile?.username || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 disabled:opacity-50"
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Subscription Section */}
      <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Subscription Plan</h2>
            <p className="mt-1 text-gray-600">
              Status: <span className={`font-semibold capitalize ${
                profile.subscription === 'premium' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {profile.subscription || 'Free'}
              </span>
            </p>
          </div>
          <button 
            onClick={handleManageSubscription}
            disabled={isRedirectingToStripe}
            className="px-6 py-2 bg-gray-800 text-white font-semibold rounded-lg shadow-sm hover:bg-gray-900 disabled:opacity-70"
          >
            {isRedirectingToStripe ? 'Loading...' : (profile.subscription === 'premium' ? 'Manage Subscription' : 'Upgrade Plan')}
          </button>
        </div>
      </div>

      {/* Delete Account Section */}
      <div className="bg-white p-8 rounded-lg shadow-md border border-red-500 border-opacity-50 mt-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-red-700">Delete Account</h2>
            <p className="mt-1 text-gray-600">Permanently remove your account and all associated data.</p>
          </div>
          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700"
          >
            Delete My Account
          </button>
        </div>
      </div>

      <DeleteConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />
    </div>
  );
}
