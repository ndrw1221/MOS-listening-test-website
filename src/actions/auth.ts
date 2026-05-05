'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Sign up the user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password })

  if (signUpError) {
    return { error: signUpError.message }
  }

  // If the user requires email confirmation, session will be null.
  // Attempt an immediate sign-in so the user doesn't need to confirm email.
  // (This requires "Enable email confirmations" to be OFF in Supabase Auth settings.)
  if (!signUpData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      // Fallback message if email confirmation is still required
      return { error: 'Account created. Please check your email for a confirmation link before logging in.' }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/admin')
}

/**
 * Server action: Signs out the current user.
 * Does NOT redirect — the client LogoutButton handles navigation.
 */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}
