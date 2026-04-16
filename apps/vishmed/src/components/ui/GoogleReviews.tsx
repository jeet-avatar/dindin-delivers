const reviews = [
  {
    name: 'Sarah Mitchell',
    date: 'March 2025',
    text: 'Dr. Arpana Pillay is absolutely wonderful. I had a telehealth visit for a sinus infection and she was thorough, attentive, and had my prescription sent to the pharmacy within minutes. So easy and convenient — I didn\'t have to leave home. Highly recommend!',
  },
  {
    name: 'James Okafor',
    date: 'January 2025',
    text: 'I started the GLP-1 weight loss program with Dr. Arpana Pillay six months ago and have lost 22 pounds. She takes time to explain everything, adjusts the plan when needed, and is always available for questions. Best medical decision I\'ve made.',
  },
  {
    name: 'Maria Gonzalez',
    date: 'February 2025',
    text: 'Finally found a primary care doctor who actually listens! Dr. Arpana Pillay spent almost 30 minutes with me on my first visit, went through my full history, and set up a real wellness plan. The office is clean and the staff is friendly too.',
  },
  {
    name: 'David Chen',
    date: 'November 2024',
    text: 'Used the telehealth option for a follow-up on my blood pressure medication. Dr. Arpana Pillay reviewed my numbers, explained the adjustments clearly, and was done in 15 minutes. Perfect for busy schedules. Will definitely keep using this service.',
  },
  {
    name: 'Patricia Williams',
    date: 'December 2024',
    text: 'Came in for urgent care after a bad fall — Dr. Arpana Pillay was calm, professional, and got me sorted out quickly. X-ray referral was handled same day. Very grateful for the same-day availability. This is the kind of care everyone deserves.',
  },
]

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return parts[0][0].toUpperCase()
}

export function GoogleReviews() {
  return (
    <section className="py-16 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-6 h-6 inline-block mr-2">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            <span className="text-slate-700 font-semibold text-lg">Google Reviews</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="font-heading text-4xl font-bold text-slate-800">5.0</p>
            <div className="flex items-center gap-0.5 text-yellow-400 text-2xl" aria-label="5 out of 5 stars">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
            <p className="text-slate-400 text-sm mt-1">Based on Google Reviews</p>
          </div>
        </div>

        {/* Review cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => {
            const initials = getInitials(review.name)
            return (
              <div
                key={review.name}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-3"
              >
                {/* Row 1: Avatar + Name + Badge */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center shrink-0"
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm leading-tight truncate">{review.name}</p>
                  </div>
                  <span className="text-xs text-slate-400 border border-slate-200 rounded-full px-2 py-0.5 shrink-0">
                    Google
                  </span>
                </div>

                {/* Row 2: Stars + Date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5 text-yellow-400 text-base" aria-label="5 out of 5 stars">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  <span className="text-slate-400 text-xs">{review.date}</span>
                </div>

                {/* Row 3: Review text */}
                <p className="text-slate-600 text-sm leading-relaxed flex-1">{review.text}</p>

                {/* Row 4: via Google */}
                <p className="text-slate-400 text-xs">via Google</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default GoogleReviews
