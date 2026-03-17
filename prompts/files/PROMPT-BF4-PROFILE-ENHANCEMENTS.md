# PROMPT BF4: Profile Enhancements — Avatar + Username + Password
# Priority: 🟡 IMPORTANT
# Estimated time: 20-25 minutes

---

## CONTEXT

Fluentia LMS — production Arabic-first LMS.
- **Repo:** alialahmad2000/fluentia-lms
- **Stack:** React 18 + Vite + Tailwind + Supabase (ref: nmjexpuycmqcxuxljier) + Framer Motion
- **Email:** noreply@fluentia.academy via Resend (RESEND_API_KEY must be set in Supabase secrets)
- **Design:** Dark theme default, RTL, Tajawal font, CSS variables only
- **Users:** Mostly young Saudi women on iPhones with Safari

## ⚠️ CRITICAL RULES

1. `const { data, error } = await ...` — NEVER `.catch()`
2. RTL Arabic-first, all colors via CSS variables
3. 44px touch targets, Safari iOS compatible
4. Soft delete only, isMounted guards on all async useEffects
5. Compress images client-side before upload

---

## TASK A: PROFILE PHOTO UPLOAD (Point 13)

**Current state:** Avatar only changes color. Need real photo upload.

### Implementation:

1. **On the avatar in Profile/Settings page**, add a camera icon overlay:
```jsx
<div className="relative w-24 h-24 mx-auto group cursor-pointer" onClick={openPhotoSheet}>
  {avatarUrl ? (
    <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
  ) : (
    <div className="w-full h-full rounded-full bg-[var(--color-primary)]/10 
      flex items-center justify-center text-3xl font-bold text-[var(--color-primary)]">
      {initials}
    </div>
  )}
  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100
    flex items-center justify-center transition-opacity">
    <Camera className="w-6 h-6 text-white" />
  </div>
</div>
```

2. **Bottom sheet** with two options (Framer Motion slide-up):
   - 📁 "اختر من المعرض" → `<input type="file" accept="image/*">`
   - 📷 "التقط صورة" → `<input type="file" accept="image/*" capture="user">`
   - Both work on iOS Safari and Android Chrome

3. **After selection → Square crop:**
   - Use a simple crop component (or `react-easy-crop` library — install if not present: `npm install react-easy-crop`)
   - Force square aspect ratio (1:1)
   - Show preview before confirming

4. **Client-side compression before upload:**
```javascript
const compressImage = async (file) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const maxSize = 800;
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        const ratio = Math.min(maxSize / w, maxSize / h);
        w *= ratio;
        h *= ratio;
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.8);
    };
    img.src = URL.createObjectURL(file);
  });
};
```
   - Max 800×800px
   - Max 500KB (JPEG quality 0.8)

5. **Upload to Supabase Storage:**
```javascript
const uploadAvatar = async (blob) => {
  const fileName = `${user.id}-${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);
  
  // Update profile
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl })
    .eq('id', user.id);
  if (updateError) throw updateError;
  
  return urlData.publicUrl;
};
```

6. **Ensure `avatars` storage bucket exists and is public:**
```sql
-- Run if bucket doesn't exist
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

Storage policy (allow authenticated users to upload their own):
```sql
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## TASK B: USERNAME SYSTEM (Points 14-15)

### Database:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
```

### Auto-generation on account creation:
- When a new profile is created (or existing profiles without username), generate:
  - First name (Arabic or English) + underscore + 4 random digits
  - Example: `نادية_4821` or `nadia_4821`
- Add a trigger or handle in the profile creation flow:
```sql
-- Or handle in application code during onboarding
CREATE OR REPLACE FUNCTION generate_username()
RETURNS trigger AS $$
DECLARE
  base_name text;
  new_username text;
  attempts int := 0;
BEGIN
  base_name := split_part(NEW.full_name, ' ', 1);
  IF base_name IS NULL OR base_name = '' THEN
    base_name := 'user';
  END IF;
  
  LOOP
    new_username := base_name || '_' || lpad(floor(random() * 10000)::text, 4, '0');
    BEGIN
      NEW.username := new_username;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      attempts := attempts + 1;
      IF attempts > 10 THEN
        NEW.username := base_name || '_' || lpad(floor(random() * 1000000)::text, 6, '0');
        RETURN NEW;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_username_on_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.username IS NULL)
  EXECUTE FUNCTION generate_username();
```

### Username editing in Settings:
1. Add "اسم المستخدم" field in profile/settings page
2. Shows current username with "@" prefix: `@نادية_4821`
3. Edit button → text input with rules:
   - 3-20 characters
   - Arabic, English, numbers, underscore only
   - No spaces, no special chars
   - Must be unique
4. **Real-time availability check** (debounced 500ms):
```jsx
const [username, setUsername] = useState('');
const [available, setAvailable] = useState(null);
const [checking, setChecking] = useState(false);

useEffect(() => {
  if (!username || username.length < 3) {
    setAvailable(null);
    return;
  }
  
  const timer = setTimeout(async () => {
    setChecking(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', currentUserId)
      .maybeSingle();
    
    setAvailable(!data && !error);
    setChecking(false);
  }, 500);
  
  return () => clearTimeout(timer);
}, [username]);
```

5. Show status indicator:
   - ✅ "متاح" (green) if available
   - ❌ "مستخدم بالفعل" (red) if taken
   - ⏳ spinner while checking

### Display:
- Under the full name everywhere the name appears: `@نادية_4821` in muted color
- Profile page, leaderboards, group messages, etc.

### Login with Username (Point 15):
1. Find the login page
2. The email field should ALSO accept usernames
3. Detection logic:
```javascript
const isEmail = (input) => input.includes('@') || input.includes('.');
const isUsername = (input) => !isEmail(input);

const handleLogin = async () => {
  let email = loginInput;
  
  if (isUsername(loginInput)) {
    // Look up email by username
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', loginInput.replace('@', ''))
      .single();
    
    if (error || !data) {
      setError('اسم المستخدم غير موجود');
      return;
    }
    email = data.email;
  }
  
  // Proceed with Supabase auth
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  // ...
};
```

4. Update the login label from "البريد الإلكتروني" to "البريد الإلكتروني أو اسم المستخدم"
5. Note: The `profiles` table needs to have the `email` column accessible. If not, you may need to query it differently or use a Supabase function.

**IMPORTANT:** For username lookup on login, you need a policy that allows looking up profiles by username WITHOUT being authenticated:
```sql
CREATE POLICY "Allow username lookup for login"
  ON profiles FOR SELECT
  TO anon
  USING (true);
-- OR more restrictive: only expose username and email columns via a view or function
```

Better approach — use an edge function for username→email resolution to avoid exposing the profiles table:
```typescript
// supabase/functions/resolve-username/index.ts
Deno.serve(async (req) => {
  const { username } = await req.json();
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('username', username)
    .single();
  
  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  }
  return new Response(JSON.stringify({ email: data.email }));
});
```

---

## TASK C: PASSWORD CHANGE & RESET (Point 16)

### C1: Change Password from Settings

In the Settings page, add "تغيير كلمة المرور" section:

```jsx
<div className="space-y-4 p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
  <h3 className="font-bold text-lg">تغيير كلمة المرور</h3>
  
  <input type="password" placeholder="كلمة المرور الحالية" 
    value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
    className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]" />
  
  <input type="password" placeholder="كلمة المرور الجديدة" 
    value={newPassword} onChange={e => setNewPassword(e.target.value)}
    className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]" />
  
  <input type="password" placeholder="تأكيد كلمة المرور الجديدة" 
    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
    className="w-full h-12 px-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)]" />
  
  <p className="text-xs text-[var(--color-muted)]">٨ أحرف على الأقل + رقم واحد</p>
  
  <button onClick={handleChangePassword}
    className="w-full h-12 rounded-xl bg-[var(--color-primary)] text-white font-semibold">
    تحديث كلمة المرور
  </button>
</div>
```

**Handler:**
```javascript
const handleChangePassword = async () => {
  if (newPassword !== confirmPassword) {
    setError('كلمات المرور غير متطابقة');
    return;
  }
  if (newPassword.length < 8 || !/\d/.test(newPassword)) {
    setError('كلمة المرور يجب أن تكون ٨ أحرف على الأقل وتحتوي رقم');
    return;
  }
  
  // Verify current password by re-signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    setError('كلمة المرور الحالية غير صحيحة');
    return;
  }
  
  // Update password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    setError('حدث خطأ — حاول مرة أخرى');
    return;
  }
  
  toast.success('تم تحديث كلمة المرور بنجاح ✅');
  setCurrentPassword('');
  setNewPassword('');
  setConfirmPassword('');
};
```

### C2: Forgot Password from Login Page

1. Add "نسيت كلمة المرور؟" link on login page
2. Click → shows email input + "إرسال رابط التغيير" button
3. Handler:
```javascript
const handleForgotPassword = async () => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    setError('حدث خطأ — تأكد من البريد الإلكتروني');
    return;
  }
  setSuccess('تم إرسال رابط التغيير إلى بريدك الإلكتروني ✉️');
};
```

4. **Create `/reset-password` page:**
   - Reads the token from URL (Supabase puts it in hash fragment)
   - Shows: new password + confirm password inputs
   - On submit: `supabase.auth.updateUser({ password })`
   - On success: redirect to login with success message

5. **Email template in Supabase Dashboard:**
   - Go to Authentication → Email Templates → Reset Password
   - Subject: `أكاديمية طلاقة — إعادة تعيين كلمة المرور`
   - From: `noreply@fluentia.academy`
   - Body in Arabic with the reset link
   - NOTE: If Resend is configured, Supabase will use it automatically. Make sure `RESEND_API_KEY` is set in Supabase secrets. If not possible via CLI, mention this to Ali.

---

## DATABASE MIGRATION

Create a single migration file:
```sql
-- Username column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Auto-generate usernames for existing profiles
UPDATE profiles SET username = split_part(full_name, ' ', 1) || '_' || lpad(floor(random() * 10000)::text, 4, '0')
WHERE username IS NULL AND full_name IS NOT NULL;

-- Avatar URL column (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Ensure avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
```

---

## VERIFICATION

- [ ] Tap avatar → bottom sheet with gallery + camera options
- [ ] Select/capture image → square crop → preview
- [ ] Confirm → compressed upload → avatar updates everywhere
- [ ] Works on iOS Safari camera capture
- [ ] Username shows under name: @نادية_4821
- [ ] Can edit username with real-time availability check
- [ ] Login accepts email OR username
- [ ] Change password from settings works (validates current password)
- [ ] "نسيت كلمة المرور" sends email → reset link works
- [ ] Reset password page works end-to-end
- [ ] All works in dark + light mode

---

## GIT + DEPLOY

```bash
git add -A
git commit -m "feat: profile photo upload, username system, password change/reset"
git push origin main
```

If resolve-username edge function was created:
```bash
npx supabase functions deploy resolve-username --project-ref nmjexpuycmqcxuxljier --no-verify-jwt
```
