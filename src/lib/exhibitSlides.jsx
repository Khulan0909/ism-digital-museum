// Supabase-ийн exhibits мөрүүдийг SqueezeCarousel-ийн slide болгож хувиргана.
export function exhibitsToSlides(exhibits) {
  return exhibits.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description ?? '',
    image: e.image_url,
    imageAlt: e.title,
    overlay: (
      <span className="sq-mark">
        {[e.creator?.display_name, e.year_created].filter(Boolean).join(', ')}
      </span>
    ),
    action: 'Дэлгэрэнгүй',
    to: `/exhibits/${e.id}`,
  }))
}
