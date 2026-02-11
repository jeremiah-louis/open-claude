const App = () => {

  return (
      <div className="h-dvh flex flex-col bg-background text-foreground">
        <div
          className="shrink-0 h-10"
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto py-12 px-6 space-y-10">
            <h1 className="text-4xl font-bold">Welcome to the app</h1>
          </div>
        </div>
      </div>
  );
};

export default App;
