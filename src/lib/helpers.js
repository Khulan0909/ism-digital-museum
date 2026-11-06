import { supabase } from './supabaseClient'

// Үзмэрийг ангилал болон бүтээгчийн мэдээлэлтэй хамт авах select (FK join).
export const EXHIBIT_SELECT =
  '*, category:exhibition_categories(id, name), creator:profiles(id, display_name, avatar_url)'

const BUCKET = 'museum'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// Зургийг Supabase Storage-д <user_id>/<файл> замаар хадгалж, нийтийн URL буцаана.
// RLS policy-оор хэрэглэгч зөвхөн өөрийн хавтас руу бичих эрхтэй.
export async function uploadImage(file, userId) {
  if (!file.type.startsWith('image/')) throw new Error('Зөвхөн зургийн файл оруулна уу.')
  if (file.size > MAX_SIZE) throw new Error('Зургийн хэмжээ 5MB-аас ихгүй байх ёстой.')

  const ext = file.name.split('.').pop().toLowerCase()
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) throw error

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// "React, Supabase , Vite" → ['React', 'Supabase', 'Vite']
export function splitList(text) {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isValidUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// Supabase-ийн англи алдааг ойлгомжтой монгол мессеж болгох
export function translateError(error) {
  const msg = error?.message ?? String(error)
  if (msg.includes('Invalid login credentials')) return 'Имэйл эсвэл нууц үг буруу байна.'
  if (msg.includes('Email not confirmed')) return 'Имэйлээ баталгаажуулна уу. Шуудангаа шалгаарай.'
  if (msg.includes('User already registered')) return 'Энэ имэйлээр бүртгэл аль хэдийн үүссэн байна.'
  if (msg.includes('Password should be')) return 'Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.'
  if (msg.includes('row-level security')) return 'Танд энэ үйлдлийг хийх эрх байхгүй байна.'
  if (msg.includes('Failed to fetch')) return 'Сүлжээний алдаа. Интернэт холболтоо шалгана уу.'
  return msg
}
