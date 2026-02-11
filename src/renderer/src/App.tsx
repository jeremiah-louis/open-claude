import React from "react";

const App = () => {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-6 p-8">
      <div
        className="fixed top-0 left-0 right-0 h-10"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />
    </div>
  );
};

export default App;
