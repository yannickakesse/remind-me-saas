# E-mails d'inscription Remind Me (à faire dans Supabase)

Aujourd'hui, l'e-mail de confirmation arrive **en anglais**, au nom de **« Supabase Auth »**, avec seulement un lien.
Ce lien peut ouvrir l'inscription dans **un autre navigateur** (ex. Gmail ouvre Chrome alors qu'on s'inscrivait dans Safari).

L'application accepte désormais un **code à 6 chiffres** saisi sur l'écran « Vérifiez votre boîte mail » : on reste dans le même navigateur. Il faut ajouter ce code dans l'e-mail.

## 1. Modèle « Confirm signup » (obligatoire pour le code)
Supabase → **Authentication** → **Emails** (Email Templates) → **Confirm signup**.

**Sujet :**
```
Votre code Remind Me : {{ .Token }}
```

**Contenu (coller dans « Message body », mode HTML) :**
```html
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#121214">
  <p style="font-size:20px;font-weight:800;margin:0 0 4px">Remind<span style="color:#D97706">Me</span></p>
  <h1 style="font-size:20px;margin:24px 0 8px">Confirmez votre adresse e-mail</h1>
  <p style="font-size:14px;line-height:1.5;margin:0 0 16px">
    Bienvenue sur Remind Me ! Saisissez ce code sur l'écran d'inscription pour continuer :
  </p>
  <p style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;background:#FEF3C7;border-radius:12px;padding:16px;margin:0 0 16px">
    {{ .Token }}
  </p>
  <p style="font-size:13px;line-height:1.5;color:#57534E;margin:0 0 16px">
    Vous pouvez aussi confirmer en touchant ce bouton (de préférence depuis le même téléphone et le même navigateur) :
  </p>
  <p style="text-align:center;margin:0 0 24px">
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#D97706;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px">
      Confirmer mon adresse
    </a>
  </p>
  <p style="font-size:12px;color:#78716C;margin:0">
    Vous n'avez pas créé de compte ? Ignorez simplement cet e-mail.
  </p>
</div>
```

Vérifier aussi : **Authentication → Providers → Email** → « Email OTP Length » = **6**.

## 2. Expéditeur « Remind Me » au lieu de « Supabase Auth » (recommandé)
L'expéditeur par défaut de Supabase est limité (quelques e-mails par heure) et s'affiche « Supabase Auth ».
Avec **Resend** (déjà prévu dans le code ; offre gratuite : 3 000 e-mails/mois, 100/jour) :

1. resend.com → **Domains** → ajouter ton domaine et créer les enregistrements DNS indiqués (sans domaine à toi, cette étape n'est pas possible).
2. Resend → **API Keys** → créer une clé (ne la colle jamais dans une conversation).
3. Supabase → **Authentication** → **Emails** → **SMTP Settings** → activer **Custom SMTP** :
   - Host : `smtp.resend.com` — Port : `465` — Username : `resend` — Password : *ta clé Resend*
   - Sender email : `noreply@ton-domaine` — Sender name : `Remind Me`
4. Enregistrer, puis refaire une inscription test.

## 3. Test
1. Créer un compte avec une nouvelle adresse.
2. L'e-mail arrive en français, avec le **code** et le bouton.
3. Saisir le code sur l'écran « Vérifiez votre boîte mail » → l'onboarding s'ouvre **dans le même navigateur**.
