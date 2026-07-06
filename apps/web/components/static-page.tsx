export function StaticPage({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {paragraphs.map((text, index) => (
        <p key={index} className="leading-7 text-muted-foreground">
          {text}
        </p>
      ))}
    </div>
  );
}
