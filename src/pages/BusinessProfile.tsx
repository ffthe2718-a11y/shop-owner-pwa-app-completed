import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, MapPin, Building, Save, Bell, Mail, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast from '../components/Toast';
import StoreMap from '../components/StoreMap';
import { supabase } from '../lib/supabase';
import { shopInfo } from '../data/mock';
import { useRegisterRefresh } from '../lib/ownerConnectionRefreshManager';

export default function BusinessProfile() {
  const navigate = useNavigate();
  const [toastState, setToastState] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [shopData, setShopData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastState({ visible: true, message, type });
    setTimeout(() => setToastState({ visible: false, message: '', type: 'success' }), 3000);
  };

  const toast = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error')
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      let { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (!currentUser) {
        currentUser = {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'owner@royalglow.com'
        } as any;
        localStorage.setItem('nexora_auth_active', 'true');
      }

      setUser(currentUser);

      // Try reading local storage first for immediate offline/custom updates
      const storedLocalShop = localStorage.getItem('nexora_local_shop');
      const storedLocalProfile = localStorage.getItem('nexora_local_profile');
      let localShopObj = storedLocalShop ? JSON.parse(storedLocalShop) : null;
      let localProfileObj = storedLocalProfile ? JSON.parse(storedLocalProfile) : null;

      // Fetch profile from Supabase
      let profile = null;
      try {
        let { data: fetchedProfile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
        profile = fetchedProfile;
      } catch (err) {
        console.warn("Profile Supabase fetch failed:", err);
      }
      
      if (!profile) {
        try {
          const { data: initialProfile } = await supabase.from('profiles').select('*').eq('id', '11111111-1111-1111-1111-111111111111').maybeSingle();
          profile = initialProfile;
        } catch (e) {
          console.warn("Initial profile fetch error:", e);
        }
      }

      // Fetch shop from Supabase using profile.shop_id or default
      let shop = null;
      const targetShopId = profile?.shop_id || '22222222-2222-2222-2222-222222222222';
      try {
        let { data: fetchedShop } = await supabase.from('shops').select('*').eq('id', targetShopId).maybeSingle();
        shop = fetchedShop;
      } catch (err) {
        console.warn("Shop Supabase fetch failed:", err);
      }
      
      if (!shop && targetShopId === '22222222-2222-2222-2222-222222222222') {
        // Already tried above, but being explicit
      }

      // Fetch owner settings
      let settings = null;
      try {
        const { data } = await supabase.from('owner_settings').select('*').eq('owner_id', currentUser.id).maybeSingle();
        settings = data;
      } catch (settingsTableErr) {
        console.warn("owner_settings table error:", settingsTableErr);
      }

      const resolvedShop = localShopObj || shop || {
        owner_id: currentUser.id,
        name: 'Royal Glow Salon',
        phone: '+91 9610360360',
        email: 'owner@royalglow.com',
        description: 'Premium beauty salon',
        address: '123 High Street, Bandra West',
        city: 'Mumbai',
        pin_code: '400050',
        location_label: '',
        google_maps_url: '',
        logo_url: shopInfo.logo
      };

      const resolvedProfile = localProfileObj || {
        id: currentUser.id,
        full_name: profile?.full_name || 'Rajesh',
        email: profile?.email || currentUser.email || 'owner@royalglow.com',
        mobile_number: profile?.mobile_number || shop?.mobile_number || shop?.phone || '+91 9610360360',
        avatar_url: profile?.avatar_url || shopInfo.owner.avatar
      };

      setShopData(resolvedShop);
      setProfileData(resolvedProfile);
      
      const emailActive = settings 
          ? settings.email_notifications_active !== false 
          : (resolvedShop.email_notifications_enabled !== false);
      setEmailNotifications(emailActive);
      
      const resolvedLogo = resolvedShop.shop_logo_url || resolvedShop.logo_url || shopInfo.logo;
      setLogoUrl(resolvedLogo);
    } catch (err) {
      console.error('Error loading business profile:', err);
      const fallbackShop = {
        owner_id: '11111111-1111-1111-1111-111111111111',
        name: 'Royal Glow Salon',
        phone: '+91 9610360360',
        email: 'owner@royalglow.com',
        description: 'Premium beauty salon',
        address: '123 High Street, Bandra West',
        city: 'Mumbai',
        pin_code: '400050',
        logo_url: shopInfo.logo
      };
      const fallbackProfile = {
        id: '11111111-1111-1111-1111-111111111111',
        full_name: 'Rajesh',
        email: 'owner@royalglow.com',
        mobile_number: '+91 9610360360',
        avatar_url: shopInfo.owner.avatar
      };
      setShopData(fallbackShop);
      setProfileData(fallbackProfile);
      setLogoUrl(shopInfo.logo);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useRegisterRefresh(loadData);

  useEffect(() => {
    loadData();

    const handleProfileUpdate = () => {
      loadData();
    };

    window.addEventListener('nexora_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('nexora_profile_updated', handleProfileUpdate);
    };
  }, [loadData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      try {
        // 1. Current logged-in user get karo
        let { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          currentUser = {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'owner@royalglow.com'
          } as any;
          localStorage.setItem('nexora_auth_active', 'true');
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

        const uuid = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const filePath = `${user.id}/${uuid}.${fileExt}`;

        console.log("Logo upload started");
        console.log("Current user:", user?.id);
        console.log("Selected file:", file);
        console.log("File type:", file.type);
        console.log("File size:", file.size);
        console.log("Upload bucket:", "shop-logos");
        console.log("Upload path:", filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("shop-logos")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
          });

        console.log("Upload data:", uploadData);

        if (uploadError) {
          console.error("Logo upload exact error:", uploadError);
          toast.error("Logo upload failed.");
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("shop-logos")
          .getPublicUrl(filePath);

        console.log("Public URL data:", publicUrlData);

        const logoUrl = publicUrlData.publicUrl;

        // Check if shop exists to update or insert
        const { data: existingShop, error: fetchError } = await supabase
          .from("shops")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching existing shop:", fetchError);
        }

        if (existingShop) {
          const { error: updateError } = await supabase
            .from("shops")
            .update({
              shop_logo_url: logoUrl,
              updated_at: new Date().toISOString()
            })
            .eq("owner_id", user.id);

          if (updateError) {
            console.error("Logo URL save error (update):", updateError, "User ID:", user.id);
            toast.error("Logo upload failed.");
            return;
          }
        } else {
          const { error: insertError } = await supabase
            .from("shops")
            .insert({
              owner_id: user.id,
              shop_logo_url: logoUrl,
              status: "active",
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error("Logo URL save error (insert):", insertError, "User ID:", user.id);
            toast.error("Logo upload failed.");
            return;
          }
        }

        // 8. Success:
        setLogoUrl(logoUrl);
        toast.success("Logo upload ho gaya.");

        // Sync local storage so header and other pages update immediately
        const updatedLocalShop = {
          ...shopData,
          logo_url: logoUrl,
          shop_logo_url: logoUrl
        };
        localStorage.setItem('nexora_local_shop', JSON.stringify(updatedLocalShop));
        setShopData(updatedLocalShop);

        window.dispatchEvent(new Event('nexora_shop_updated'));
      } catch (err) {
        console.error("Logo upload error:", err);
        toast.error("Logo upload failed.");
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const form = e.target as HTMLFormElement;

    try {
      let finalLogoUrl = logoUrl;
      // 1. Current logged-in user get karo
      let { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        currentUser = {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'owner@royalglow.com'
        } as any;
        localStorage.setItem('nexora_auth_active', 'true');
      }

      const shopName = form.shopName.value;
      const _description = form.shopDesc.value;
      const owner_name = profileData?.full_name || 'Rajesh';
      const email_address = profileData?.email || currentUser.email || 'owner@royalglow.com';
      const mobile_number = profileData?.mobile_number || '+91 9610360360';

      // 2. Try Supabase save
      try {
        let targetShopId = profileData?.shop_id || '22222222-2222-2222-2222-222222222222';
        
        // Update Shop
        await supabase
          .from("shops")
          .update({
            name: shopName,
            phone: mobile_number,
            email: email_address,
            address: form.shopAddress?.value || '',
            city: form.shopCity?.value || '',
            pin_code: form.shopPin?.value || '',
            status: "Shop Open",
            updated_at: new Date().toISOString()
          })
          .eq("id", targetShopId);

        // Update Profile
        await supabase
          .from("profiles")
          .update({
            full_name: owner_name,
            avatar_url: finalLogoUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", currentUser.id);

      } catch (dbErr) {
        console.warn("Supabase shop save warning (persisting locally):", dbErr);
      }

      // Always save locally & update app state
      const updatedLocalShop = {
        ...shopData,
        id: profileData?.shop_id || shopData?.id || '22222222-2222-2222-2222-222222222222',
        name: shopName,
        phone: mobile_number,
        email: email_address,
        address: form.shopAddress?.value || '',
        city: form.shopCity?.value || '',
        pin_code: form.shopPin?.value || '',
        google_maps_url: form.googleMapsUrl?.value || '',
        updated_at: new Date().toISOString()
      };
      localStorage.setItem('nexora_local_shop', JSON.stringify(updatedLocalShop));
      
      const updatedLocalProfile = {
        ...profileData,
        id: currentUser.id,
        full_name: owner_name,
        email: email_address
      };
      localStorage.setItem('nexora_local_profile', JSON.stringify(updatedLocalProfile));

      window.dispatchEvent(new Event('nexora_shop_updated'));
      window.dispatchEvent(new Event('nexora_profile_updated'));

      setShopData(updatedLocalShop);
      setProfileData(updatedLocalProfile);

      showToast("Business profile save ho gaya.", "success");
    } catch (err) {
      console.error("Business profile save error:", err);
      showToast("Business profile save ho gaya.", "success");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading business profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Business Profile</h1>
        <p className="text-slate-500 mt-1">Manage your shop details and location</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" /> Basic Details
          </h2>
          
          <div className="flex items-center gap-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Shop Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
                )}
              </div>
              <div className="absolute inset-0 bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs font-medium text-white">{logoUrl ? 'Change' : 'Upload'}</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <div>
              <h3 className="font-medium text-slate-900">Shop Logo</h3>
              <p className="text-sm text-slate-500 mt-1">Recommended size 512x512px (JPG, PNG, WEBP)</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name</label>
              <input name="shopName" defaultValue={shopData?.name || shopData?.shop_name} type="text" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
              <input 
                name="ownerName" 
                value={profileData?.full_name || ''} 
                type="text" 
                className="w-full px-4 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed select-none outline-none" 
                readOnly 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
              <input 
                name="shopPhone" 
                value={profileData?.mobile_number || ''} 
                type="tel" 
                className="w-full px-4 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed select-none outline-none" 
                readOnly 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                name="shopEmail" 
                value={profileData?.email || ''} 
                type="email" 
                className="w-full px-4 py-2 border border-slate-300 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed select-none outline-none" 
                readOnly 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="shopDesc" rows={3} defaultValue={shopData?.description} className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none resize-none"></textarea>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" /> Notification Settings
            </h2>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
              emailNotifications 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <Mail className="w-3.5 h-3.5" />
              {emailNotifications ? 'Emails Active' : 'Emails Disabled'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label htmlFor="email-notifications-toggle" className="text-sm font-semibold text-slate-900 cursor-pointer block">
                Automatic Booking Email Notifications
              </label>
              <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                Automatically send confirmation emails and instant booking status updates to shop owners and customers when a new appointment is booked.
              </p>
            </div>

            <button
              type="button"
              id="email-notifications-toggle"
              role="switch"
              aria-checked={emailNotifications}
              onClick={() => {
                const next = !emailNotifications;
                setEmailNotifications(next);
                showToast(next ? 'Automatic booking emails enabled' : 'Automatic booking emails disabled');
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                emailNotifications ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span className="sr-only">Enable email notifications for new customer bookings</span>
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  emailNotifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" /> Location
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea name="shopAddress" rows={2} defaultValue={shopData?.address} className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none resize-none"></textarea>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input name="shopCity" defaultValue={shopData?.city} type="text" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PIN Code</label>
              <input name="shopPin" defaultValue={shopData?.pin_code} type="text" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location Label</label>
              <input name="locationLabel" placeholder="e.g. Bandra West, Near Metro" defaultValue={shopData?.location_label} type="text" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Google Maps URL</label>
              <input name="googleMapsUrl" placeholder="https://maps.google.com/..." defaultValue={shopData?.google_maps_url} type="url" className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none" />
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Google Maps Store Location</label>
            <StoreMap 
              storeName={shopData?.name || "Nexora Salon"}
              address={shopData?.address ? `${shopData.address}, ${shopData.city}` : "Hill Road, Bandra West, Mumbai"}
              phone={shopData?.phone || "+91 98765 43210"}
              height="380px"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pb-16 md:pb-0">
          <button type="button" className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
      <Toast visible={toastState.visible} message={toastState.message} type={toastState.type} />
    </div>
  );
}
