import { useState, useEffect, useCallback } from 'react';
import { User, Store, Bell, Moon, Languages, Shield, HelpCircle, FileText, LogOut, ChevronRight, Loader2, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { shopInfo } from '../data/mock';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { supabase } from '../lib/supabase';
import { logoutOwner } from '../services/ownerAuthService';

export default function OwnerProfile() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [activeSettingModal, setActiveSettingModal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  const [personalDetails, setPersonalDetails] = useState({
    name: shopInfo.owner.name,
    email: 'owner@royalglow.com',
    phone: '+91 9610360360',
    avatar: shopInfo.owner.avatar
  });

  const [shopData, setShopData] = useState<any>(null);

  const [ownerSettings, setOwnerSettings] = useState({
    automatic_booking_email: true,
    email_notifications_active: true,
    booking_status_email: true,
    customer_email_notification: true,
    appearance_mode: "light",
    accent_color: "blue"
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Get currently logged-in user
      let { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (!currentUser && localStorage.getItem('nexora_auth_active') === 'true') {
        currentUser = {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'owner@royalglow.com'
        } as any;
        userError = null;
      }
      if (!currentUser) {
        console.error("Auth user missing:", userError);
        showToast("Login session nahi mila. Dobara login karein.", "error");
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
        return;
      }

      setUser(currentUser);

      // Fetch profile
      let { data: profile, error: profileErr } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
      if (profileErr) {
        console.error("Profile fetch error:", profileErr);
        if (profileErr.code === '42501') {
          console.error("RLS Policy Error:", profileErr);
        }
      }
      
      if (!profile) {
        // Auto-provision profile
        const newProfile = {
          id: currentUser.id,
          email: currentUser.email || 'owner@royalglow.com',
          full_name: 'Rajesh',
          role: 'shop_owner'
        };
        const { data: insertedProfile, error: upsertErr } = await supabase.from('profiles').upsert(newProfile).select().maybeSingle();
        if (upsertErr) {
          console.error("Profile upsert error during auto-provision:", upsertErr);
          if (upsertErr.code === '42501') {
            console.error("RLS Policy Error:", upsertErr);
          }
        }
        profile = insertedProfile || newProfile;
      }

      // Fetch owner_settings
      let settings = null;
      try {
        const { data, error: settingsError } = await supabase.from('owner_settings').select('*').eq('owner_id', currentUser.id).maybeSingle();
        if (settingsError) {
          console.error("Settings fetch error:", settingsError);
          if (settingsError.code === '42501') {
            console.error("RLS Policy Error:", settingsError);
          }
        } else {
          settings = data;
        }
      } catch (settingsTableErr) {
        console.warn("owner_settings table might not exist:", settingsTableErr);
      }

      if (!settings) {
        const defaultSettings = {
          owner_id: currentUser.id,
          automatic_booking_email: true,
          email_notifications_active: true,
          booking_status_email: true,
          customer_email_notification: true,
          appearance_mode: "light",
          accent_color: "blue"
        };
        try {
          const { data: insertedSettings, error: insertErr } = await supabase.from('owner_settings').upsert(defaultSettings).select().maybeSingle();
          if (insertErr) {
            console.error("Settings insert error during auto-provision:", insertErr);
            if (insertErr.code === '42501') {
              console.error("RLS Policy Error:", insertErr);
            }
          } else {
            settings = insertedSettings || defaultSettings;
          }
        } catch (settingsTableErr) {
          console.warn("owner_settings table might not exist:", settingsTableErr);
          settings = defaultSettings;
        }
      }

      // Fetch shop
      const { data: shop, error: shopErr } = await supabase.from('shops').select('*').eq('owner_id', currentUser.id).maybeSingle();
      if (shopErr) {
        console.error("Shop fetch error:", shopErr);
        if (shopErr.code === '42501') {
          console.error("RLS Policy Error:", shopErr);
        }
      }

      setShopData(shop);

      setPersonalDetails({
        name: profile?.full_name || 'Rajesh',
        email: profile?.email || currentUser.email || 'owner@royalglow.com',
        phone: profile?.mobile_number || shop?.mobile_number || shop?.phone || '+91 9610360360',
        avatar: profile?.avatar_url || shopInfo.owner.avatar
      });

      if (settings) {
        setOwnerSettings({
          automatic_booking_email: settings.automatic_booking_email !== false,
          email_notifications_active: settings.email_notifications_active !== false,
          booking_status_email: settings.booking_status_email !== false,
          customer_email_notification: settings.customer_email_notification !== false,
          appearance_mode: settings.appearance_mode || 'light',
          accent_color: settings.accent_color || 'blue'
        });
      }
    } catch (err) {
      console.error('Error fetching owner profile data:', err);
      showToast('Error loading profile settings');
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();

    const handleShopUpdate = () => {
      loadData();
    };

    window.addEventListener('nexora_shop_updated', handleShopUpdate);
    window.addEventListener('nexora_profile_updated', handleShopUpdate);

    return () => {
      window.removeEventListener('nexora_shop_updated', handleShopUpdate);
      window.removeEventListener('nexora_profile_updated', handleShopUpdate);
    };
  }, [loadData]);
  
  const [layoutMode, setLayoutMode] = useState<'Compact' | 'Comfortable'>(
    () => (localStorage.getItem('nexora_layout_mode') as 'Compact' | 'Comfortable') || 'Comfortable'
  );

  const handleLayoutModeChange = (mode: 'Compact' | 'Comfortable') => {
    setLayoutMode(mode);
    localStorage.setItem('nexora_layout_mode', mode);
    showToast(`Layout density set to ${mode} mode`);
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: '', type: 'success' }), 3000);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await logoutOwner({
        ownerId: user?.id,
        onSuccess: () => {
          navigate('/login', { replace: true });
        }
      });
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('nexora_auth_active');
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleSavePersonalDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = form.ownerName.value;
    const email = form.ownerEmail.value;
    const phone = form.ownerPhone.value;

    try {
      // 1. Current logged-in user get karo
      let { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (!currentUser && localStorage.getItem('nexora_auth_active') === 'true') {
        currentUser = {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'owner@royalglow.com'
        } as any;
        userError = null;
      }
      
      // 2. Agar user missing ho
      if (!currentUser) {
        console.error("Auth user missing:", userError);
        showToast("Login session nahi mila. Dobara login karein.", "error");
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
        return;
      }

      // 3. Save Details button par profiles table me upsert karo
      const payload = {
        id: currentUser.id,
        full_name: name,
        email: email,
        mobile_number: phone,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: "id" });

      // 4. Error par console me actual error log karo
      if (error) {
        console.error("Profile save error:", error);
        showToast("Profile save nahi ho paya.", "error");
        return;
      }

      // Copy to shops table automatically if exists
      try {
        const { data: existingShop } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", currentUser.id)
          .maybeSingle();

        if (existingShop) {
          await supabase
            .from("shops")
            .update({
              owner_name: name,
              email_address: email,
              mobile_number: phone,
              updated_at: new Date().toISOString()
            })
            .eq("owner_id", currentUser.id);
          
          window.dispatchEvent(new Event('nexora_shop_updated'));
        }
      } catch (shopSyncErr) {
        console.warn("Could not sync shop owner details:", shopSyncErr);
      }

      // 5. Success par
      setPersonalDetails(prev => ({ ...prev, name, email, phone }));
      setActiveSettingModal(null);
      showToast("Profile save ho gaya.", "success");

      // Sync local storage profile
      const localProf = {
        id: currentUser.id,
        full_name: name,
        email: email,
        avatar_url: personalDetails.avatar
      };
      localStorage.setItem('nexora_local_profile', JSON.stringify(localProf));
      
      // Notify other parts of the app
      window.dispatchEvent(new Event('nexora_profile_updated'));
    } catch (err) {
      console.error("Profile save error:", err);
      showToast("Profile save nahi ho paya.", "error");
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      try {
        // 1. Current logged-in user get karo
        let { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

        if (!currentUser && localStorage.getItem('nexora_auth_active') === 'true') {
          currentUser = {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'owner@royalglow.com'
          } as any;
          userError = null;
        }

        // 2. Agar user missing ho
        if (!currentUser) {
          console.error("Auth user missing:", userError);
          showToast("Login session nahi mila. Dobara login karein.", "error");
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 1500);
          return;
        }

        const user = currentUser;

        // 3. File validation add karo
        const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedExts.includes(fileExt)) {
          showToast("Only JPG, PNG, and WEBP files are allowed", "error");
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          showToast("File size must be less than 5MB", "error");
          return;
        }

        // 5. Upload path exactly ye rakho (with safe crypto.randomUUID fallback)
        const uuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const filePath = `${user.id}/${uuid}.${fileExt}`;

        let avatarUrl = '';

        try {
          // 6. Upload code
          const { error: uploadError } = await supabase.storage
            .from("owner-avatars")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: true
            });

          if (uploadError) {
            throw uploadError;
          }

          // 8. Success par public URL nikalo
          const { data } = supabase.storage
            .from("owner-avatars")
            .getPublicUrl(filePath);

          avatarUrl = data.publicUrl;
        } catch (uploadError) {
          console.warn("Real avatar storage upload failed, falling back to local base64:", uploadError);
          try {
            avatarUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (error) => reject(error);
              reader.readAsDataURL(file);
            });
          } catch (base64Err) {
            console.error("Base64 conversion failed:", base64Err);
            showToast("Avatar upload failed.", "error");
            return;
          }
        }

        // 9. Avatar URL ko profiles table me save karo
        try {
          const { data: existingProfile, error: fetchError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (fetchError) {
            console.error("Avatar upload profile fetch error:", fetchError);
          }

          let dbError = null;
          if (existingProfile) {
            const { error } = await supabase
              .from("profiles")
              .update({
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
              })
              .eq("id", user.id);
            dbError = error;
          } else {
            const { error } = await supabase
              .from("profiles")
              .upsert({
                id: user.id,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString()
              });
            dbError = error;
          }

          if (dbError) {
            console.error("Database error saving avatar URL:", dbError);
          }
        } catch (dbErr) {
          console.warn("Could not save avatar URL to DB, continuing with local storage:", dbErr);
        }

        // 10. Success par
        setPersonalDetails(prev => ({ ...prev, avatar: avatarUrl }));
        showToast("Avatar upload ho gaya.", "success");

        // Sync local storage profile
        const localProf = {
          id: user.id,
          full_name: personalDetails.name,
          email: personalDetails.email,
          avatar_url: avatarUrl
        };
        localStorage.setItem('nexora_local_profile', JSON.stringify(localProf));

        // Notify other parts of the app
        window.dispatchEvent(new Event('nexora_profile_updated'));
      } catch (err) {
        console.error("Avatar upload error:", err);
        showToast("Avatar upload failed.", "error");
      }
    }
  };

  const handleToggleSetting = async (key: string, value: boolean) => {
    if (!user) return;
    const nextSettings = { ...ownerSettings, [key]: value };
    setOwnerSettings(nextSettings);
    
    try {
      // Step 6: Ensure row exists before update
      const { data: existingSettings, error: fetchErr } = await supabase
        .from("owner_settings")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
        
      if (fetchErr) {
        console.error("Settings check error:", fetchErr);
      }
      
      if (!existingSettings) {
        const { error: insertErr } = await supabase.from('owner_settings').insert({
          owner_id: user.id,
          automatic_booking_email: true,
          email_notifications_active: true,
          booking_status_email: true,
          customer_email_notification: true,
          appearance_mode: "light",
          accent_color: "blue",
          updated_at: new Date().toISOString()
        });
        if (insertErr) {
          console.error("Settings update Supabase error:", {
            message: insertErr.message,
            details: insertErr.details,
            hint: insertErr.hint,
            code: insertErr.code,
            fullError: insertErr
          });
          if (insertErr.code === '42501') {
            console.error("RLS Policy Violation:", {
              table: "owner_settings",
              userId: user?.id,
              operation: "insert",
              error: insertErr
            });
          }
          throw insertErr;
        }
      }

      const { error } = await supabase
        .from('owner_settings')
        .update({
          [key]: value,
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', user.id);
      
      if (error) {
        console.error("Settings update Supabase error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        if (error.code === '42501') {
          console.error("RLS Policy Violation:", {
            table: "owner_settings",
            userId: user?.id,
            operation: "update",
            error
          });
        }
        throw error;
      }
      showToast('Settings update ho gayi.', 'success');
    } catch (err: any) {
      if (err?.message?.includes('fetch') || err?.message?.includes('Network') || err?.message?.includes('timeout') || err?.code === 'TypeError') {
        console.error("Network or timeout error:", err);
        showToast("Network problem hai. Dobara try karein.", "error");
      } else {
        console.error('Error updating notification setting:', err);
        showToast('Settings update nahi ho payi.', 'error');
      }
      // Revert state
      setOwnerSettings(ownerSettings);
    }
  };

  const handleAppearanceChange = async (mode: 'light' | 'dark') => {
    if (!user) return;
    const nextSettings = { ...ownerSettings, appearance_mode: mode };
    setOwnerSettings(nextSettings);
    
    try {
      // Step 6: Ensure row exists
      const { data: existingSettings, error: fetchErr } = await supabase
        .from("owner_settings")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
        
      if (fetchErr) {
        console.error("Settings check error:", fetchErr);
      }
      
      if (!existingSettings) {
        const { error: insertErr } = await supabase.from('owner_settings').insert({
          owner_id: user.id,
          automatic_booking_email: true,
          email_notifications_active: true,
          booking_status_email: true,
          customer_email_notification: true,
          appearance_mode: "light",
          accent_color: "blue",
          updated_at: new Date().toISOString()
        });
        if (insertErr) {
          console.error("Appearance update Supabase error:", {
            message: insertErr.message,
            details: insertErr.details,
            hint: insertErr.hint,
            code: insertErr.code,
            fullError: insertErr
          });
          if (insertErr.code === '42501') {
            console.error("RLS Policy Violation:", {
              table: "owner_settings",
              userId: user?.id,
              operation: "insert",
              error: insertErr
            });
          }
          throw insertErr;
        }
      }

      const { error } = await supabase
        .from('owner_settings')
        .update({
          appearance_mode: mode,
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', user.id);
      
      if (error) {
        console.error("Appearance update Supabase error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        if (error.code === '42501') {
          console.error("RLS Policy Violation:", {
            table: "owner_settings",
            userId: user?.id,
            operation: "update",
            error
          });
        }
        throw error;
      }
      showToast('Appearance settings save ho gayi.', 'success');
    } catch (err: any) {
      if (err?.message?.includes('fetch') || err?.message?.includes('Network') || err?.message?.includes('timeout') || err?.code === 'TypeError') {
        console.error("Network or timeout error:", err);
        showToast("Network problem hai. Dobara try karein.", "error");
      } else {
        console.error('Error updating appearance:', err);
        showToast('Settings update nahi ho payi.', 'error');
      }
      setOwnerSettings(ownerSettings);
    }
  };

  const handleAccentColorChange = async (color: string) => {
    if (!user) return;
    const nextSettings = { ...ownerSettings, accent_color: color };
    setOwnerSettings(nextSettings);
    
    try {
      // Step 6: Ensure row exists
      const { data: existingSettings, error: fetchErr } = await supabase
        .from("owner_settings")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
        
      if (fetchErr) {
        console.error("Settings check error:", fetchErr);
      }
      
      if (!existingSettings) {
        const { error: insertErr } = await supabase.from('owner_settings').insert({
          owner_id: user.id,
          automatic_booking_email: true,
          email_notifications_active: true,
          booking_status_email: true,
          customer_email_notification: true,
          appearance_mode: "light",
          accent_color: "blue",
          updated_at: new Date().toISOString()
        });
        if (insertErr) {
          console.error("Appearance update Supabase error:", {
            message: insertErr.message,
            details: insertErr.details,
            hint: insertErr.hint,
            code: insertErr.code,
            fullError: insertErr
          });
          if (insertErr.code === '42501') {
            console.error("RLS Policy Violation:", {
              table: "owner_settings",
              userId: user?.id,
              operation: "insert",
              error: insertErr
            });
          }
          throw insertErr;
        }
      }

      const { error } = await supabase
        .from('owner_settings')
        .update({
          accent_color: color,
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', user.id);
      
      if (error) {
        console.error("Appearance update Supabase error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        if (error.code === '42501') {
          console.error("RLS Policy Violation:", {
            table: "owner_settings",
            userId: user?.id,
            operation: "update",
            error
          });
        }
        throw error;
      }
      showToast('Appearance settings save ho gayi.', 'success');
    } catch (err: any) {
      if (err?.message?.includes('fetch') || err?.message?.includes('Network') || err?.message?.includes('timeout') || err?.code === 'TypeError') {
        console.error("Network or timeout error:", err);
        showToast("Network problem hai. Dobara try karein.", "error");
      } else {
        console.error('Error updating accent color:', err);
        showToast('Settings update nahi ho payi.', 'error');
      }
      setOwnerSettings(ownerSettings);
    }
  };

  const menuItems = [
    { icon: User, label: 'Personal Details', color: 'text-blue-500', bg: 'bg-blue-50' },
    { icon: Store, label: 'Business Profile', color: 'text-emerald-500', bg: 'bg-emerald-50', to: '/app/owner/profile' },
    { icon: Moon, label: 'Appearance', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Bell, label: 'Notifications', color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Languages, label: 'Language', color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { icon: Shield, label: 'Security', color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  const supportItems = [
    { icon: HelpCircle, label: 'Help & Support', to: '/app/owner/support' },
    { icon: FileText, label: 'Privacy Policy' },
    { icon: FileText, label: 'Terms of Service' },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading settings...</p>
      </div>
    );
  }

  const profileFields = [
    { label: 'Owner Name', value: !!(personalDetails.name && personalDetails.name.trim()), category: 'Profile' },
    { label: 'Email Address', value: !!(personalDetails.email && personalDetails.email.trim()), category: 'Profile' },
    { label: 'Mobile Number', value: !!(personalDetails.phone && personalDetails.phone.trim()), category: 'Profile' },
    { label: 'Profile Photo', value: !!(personalDetails.avatar && personalDetails.avatar !== shopInfo.owner.avatar), category: 'Profile' },
    { label: 'Shop Name', value: !!(shopData?.shop_name || shopData?.name), category: 'Business' },
    { label: 'Shop Logo', value: !!(shopData?.shop_logo_url || shopData?.logo_url), category: 'Business' },
    { label: 'Shop Description', value: !!(shopData?.description), category: 'Business' },
    { label: 'Shop Address', value: !!(shopData?.address), category: 'Business' }
  ];

  const completedFields = profileFields.filter(f => f.value);
  const pendingFields = profileFields.filter(f => !f.value);
  const completionPercentage = Math.round((completedFields.length / profileFields.length) * 100);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 hidden md:block">Settings</h1>

      {/* Progress Indicator Component */}
      <div id="profile-setup-progress" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <span>Profile Setup Progress</span>
              {completionPercentage === 100 ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-600 px-2.5 py-0.5 rounded-full border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> Incomplete
                </span>
              )}
            </h3>
            <p className="text-sm text-slate-500 max-w-md">
              {completionPercentage === 100
                ? "Excellent! Your profile and business details are fully completed. This builds solid trust with your customers."
                : "Fill in all your details to reach 100% completion and make your salon stand out."}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-3xl font-extrabold text-blue-600 tabular-nums">{completionPercentage}%</span>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">Finished</div>
          </div>
        </div>

        {/* Dynamic progress bar */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Encouraging checklists / remaining items */}
        {pendingFields.length > 0 ? (
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Remaining steps to 100%</h4>
            <div className="flex flex-wrap gap-2">
              {pendingFields.map((field, index) => (
                <button
                  key={index}
                  id={`pending-field-${field.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    if (field.category === 'Profile') {
                      setActiveSettingModal('Personal Details');
                    } else {
                      navigate('/app/owner/profile');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 text-xs font-medium transition-all cursor-pointer group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></span>
                  <span>{field.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl flex items-center gap-2.5 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">Everything set up! Your profile is 100% complete. Thank you for keeping it up to date!</span>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative group cursor-pointer shrink-0">
          <img 
            src={personalDetails.avatar} 
            alt="Profile" 
            className="w-16 h-16 rounded-full object-cover border border-slate-200" 
          />
          <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="w-5 h-5" />
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleAvatarUpload} 
              className="hidden" 
            />
          </label>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">{personalDetails.name}</h2>
          <p className="text-sm text-slate-500">{shopInfo.name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-medium text-slate-600">Active Account</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Account Settings</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {menuItems.map((item, idx) => {
            const content = (
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors w-full text-left">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            );
            return item.to ? (
              <Link key={idx} to={item.to} className="block">{content}</Link>
            ) : (
              <button key={idx} onClick={() => setActiveSettingModal(item.label)} className="block w-full">{content}</button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Support & About</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {supportItems.map((item, idx) => {
            const content = (
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors w-full text-left">
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            );
            return item.to ? (
              <Link key={idx} to={item.to} className="block">{content}</Link>
            ) : (
              <button key={idx} onClick={() => setActiveSettingModal(item.label)} className="block w-full">{content}</button>
            );
          })}
        </div>
      </div>

      <button 
        onClick={handleLogout} 
        disabled={isLoggingOut}
        className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 font-semibold rounded-2xl hover:bg-red-100 transition-colors disabled:opacity-60 cursor-pointer"
      >
        {isLoggingOut ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Signing out…</span>
          </>
        ) : (
          <>
            <LogOut className="w-5 h-5" />
            <span>Log Out</span>
          </>
        )}
      </button>

      <div className="text-center pb-8">
        <p className="text-xs text-slate-400 font-medium">NexoraOS version 1.0.0</p>
      </div>

      <Modal isOpen={!!activeSettingModal} onClose={() => setActiveSettingModal(null)} title={activeSettingModal || ''}>
        <div className="space-y-6">
          {activeSettingModal === 'Personal Details' && (
            <form onSubmit={handleSavePersonalDetails} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input name="ownerName" defaultValue={personalDetails.name} type="text" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input name="ownerEmail" defaultValue={personalDetails.email} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                <input name="ownerPhone" defaultValue={personalDetails.phone} type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" required />
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Save Details</button>
              </div>
            </form>
          )}

          {activeSettingModal === 'Appearance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-900 block text-sm">Dark Mode</span>
                  <span className="text-xs text-slate-500">Switch color theme</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={ownerSettings.appearance_mode === 'dark'} 
                    onChange={(e) => handleAppearanceChange(e.target.checked ? 'dark' : 'light')} 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div>
                  <span className="font-medium text-slate-900 block text-sm">Accent Color</span>
                  <span className="text-xs text-slate-500">Choose your brand color</span>
                </div>
                <div className="flex gap-3">
                  {['blue', 'emerald', 'purple', 'rose', 'amber'].map((color) => {
                    const colorClasses: Record<string, string> = {
                      blue: 'bg-blue-600',
                      emerald: 'bg-emerald-600',
                      purple: 'bg-purple-600',
                      rose: 'bg-rose-600',
                      amber: 'bg-amber-600',
                    };
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleAccentColorChange(color)}
                        className={`w-8 h-8 rounded-full ${colorClasses[color]} border-2 transition-all flex items-center justify-center ${
                          ownerSettings.accent_color === color ? 'border-slate-900 scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                        }`}
                        title={`Accent ${color}`}
                      >
                        {ownerSettings.accent_color === color && (
                          <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div>
                  <span className="font-medium text-slate-900 block text-sm">Layout Density</span>
                  <span className="text-xs text-slate-500">Customize spacing and padding on data-heavy pages like Bookings</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(['Comfortable', 'Compact'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleLayoutModeChange(mode)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        layoutMode === mode
                          ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 font-medium bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs">{mode === 'Comfortable' ? '🛋️ Comfortable' : '⚡ Compact'}</span>
                        {layoutMode === mode && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                      </div>
                      <p className="text-[11px] text-slate-500 font-normal">
                        {mode === 'Comfortable' ? 'Spacious padding & large preview avatars' : 'High information density & dense rows'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSettingModal === 'Notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-700 block text-sm">Automatic Booking Emails</span>
                  <span className="text-xs text-slate-500">Send emails automatically on bookings</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={ownerSettings.automatic_booking_email} 
                    onChange={(e) => handleToggleSetting('automatic_booking_email', e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-700 block text-sm">Email Notifications Active</span>
                  <span className="text-xs text-slate-500">Enable overall email alerts</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={ownerSettings.email_notifications_active} 
                    onChange={(e) => handleToggleSetting('email_notifications_active', e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-700 block text-sm">Booking Status Email</span>
                  <span className="text-xs text-slate-500">Get updates on booking status changes</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={ownerSettings.booking_status_email} 
                    onChange={(e) => handleToggleSetting('booking_status_email', e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-700 block text-sm">Customer Email Notification</span>
                  <span className="text-xs text-slate-500">Notify customers when they book</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={ownerSettings.customer_email_notification} 
                    onChange={(e) => handleToggleSetting('customer_email_notification', e.target.checked)} 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}
          {activeSettingModal === 'Language' && (
            <select className="w-full px-4 py-2 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600">
              <option>English</option>
              <option>Hindi</option>
              <option>Spanish</option>
            </select>
          )}
          {activeSettingModal === 'Security' && (
            <button onClick={() => {showToast('Password reset link sent'); setActiveSettingModal(null);}} className="w-full py-2 bg-blue-50 text-blue-700 font-medium rounded-xl">
              Change Password
            </button>
          )}
          {['Privacy Policy', 'Terms of Service'].includes(activeSettingModal || '') && (
            <p className="text-sm text-slate-500">This feature is not available in the demo version.</p>
          )}
        </div>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}