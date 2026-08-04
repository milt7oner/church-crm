import { createClient } from '@/lib/supabase/server'
import RegistroLiderForm from '@/components/RegistroLiderForm'

export default async function RegistroLiderPage() {
  const supabase = await createClient()

  // Consultar todas las iglesias registradas
  const { data: iglesias } = await supabase
    .from('iglesias')
    .select('id, nombre')
    .order('nombre', { ascending: true })

  return <RegistroLiderForm iglesias={iglesias || []} />
}