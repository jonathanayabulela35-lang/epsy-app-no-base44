import React from 'react'

export default function ComingSoon({ title, note }) {
  return (
    <div className="min-h-screen bg-[#F1F4F6] px-4 md:px-8 py-8 pb-24">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-black mb-3">{title}</h1>
        <p className="text-[#2E5C6E]">
          This page is part of Epsy, but its data layer is still being migrated from Base44 to Supabase.
        </p>
        {note ? (
          <div className="mt-4 p-4 rounded-xl bg-white border border-[#2E5C6E]/20 text-[#1E1E1E]">
            {note}
          </div>
        ) : null}
      </div>
    </div>
  )
}
