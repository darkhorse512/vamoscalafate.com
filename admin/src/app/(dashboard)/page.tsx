import { redirect } from 'next/navigation'

/** The admin root is the dashboard. */
export default function Index() {
  redirect('/dashboard')
}
