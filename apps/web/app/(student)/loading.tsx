export default function StudentLoading() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-7 w-44 rounded-xl" style={{ backgroundColor: "#F5F5F3" }} />
          <div className="h-4 w-64 rounded-lg" style={{ backgroundColor: "#F5F5F3" }} />
          <div className="mt-6 h-[72px] rounded-2xl" style={{ backgroundColor: "#F5F5F3" }} />
          <div className="h-[72px] rounded-2xl" style={{ backgroundColor: "#F5F5F3" }} />
          <div className="mt-8 h-4 w-24 rounded-lg" style={{ backgroundColor: "#F5F5F3" }} />
          <div className="h-[68px] rounded-2xl" style={{ backgroundColor: "#F5F5F3" }} />
          <div className="h-[68px] rounded-2xl" style={{ backgroundColor: "#F5F5F3" }} />
        </div>
      </div>
    </div>
  )
}
