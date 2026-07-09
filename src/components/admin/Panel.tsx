export default function Panel({
  title,
  desc,
  action,
  children,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="paper overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: "1px solid #e2e2e7" }}
      >
        <div>
          <h2 className="font-serif text-[1.02rem] font-bold">{title}</h2>
          {desc && (
            <p className="text-[0.72rem]" style={{ color: "#757575" }}>
              {desc}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
