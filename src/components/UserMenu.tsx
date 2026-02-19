import { useState } from 'react';
import { LogOut, Settings, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { User as SupaUser } from '@supabase/supabase-js';

interface UserMenuProps {
  user: SupaUser;
}

export function UserMenu({ user }: UserMenuProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const displayName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Utilisateur';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowConfirm(false);
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Un email de confirmation a été envoyé à votre nouvelle adresse.');
    setNewEmail('');
  };

  const handleUpdatePassword = async () => {
    if (!newPassword.trim() || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Mot de passe mis à jour.');
    setNewPassword('');
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-all"
      >
        <User size={14} />
        {displayName}
      </button>

      {/* Account popup */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">Mon compte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground text-center">{user.email}</p>

            {/* Change email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Changer l'email</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Nouvel email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="h-9 text-sm"
                />
                <button
                  onClick={handleUpdateEmail}
                  disabled={saving || !newEmail.trim()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            </div>

            {/* Change password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Changer le mot de passe</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="h-9 text-sm"
                />
                <button
                  onClick={handleUpdatePassword}
                  disabled={saving || !newPassword.trim()}
                  className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 transition-all"
            >
              <LogOut size={16} /> Se déconnecter
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
