const JupiterBrainsLogo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* JupiterBrains style geometric brain/network logo */}
      <g fill="currentColor">
        {/* Central hexagon */}
        <path d="M20 8L28 13V23L20 28L12 23V13L20 8Z" strokeWidth="1.5" stroke="currentColor" fillOpacity="0.1" />
        
        {/* Inner connections */}
        <circle cx="20" cy="13" r="2" />
        <circle cx="25" cy="18" r="2" />
        <circle cx="25" cy="25" r="1.5" />
        <circle cx="20" cy="28" r="1.5" />
        <circle cx="15" cy="25" r="1.5" />
        <circle cx="15" cy="18" r="2" />
        <circle cx="20" cy="20" r="2.5" />
        
        {/* Connecting lines */}
        <path d="M20 13L20 17.5" stroke="currentColor" strokeWidth="1" />
        <path d="M22.5 20L25 18" stroke="currentColor" strokeWidth="1" />
        <path d="M17.5 20L15 18" stroke="currentColor" strokeWidth="1" />
        <path d="M20 22.5L20 26.5" stroke="currentColor" strokeWidth="1" />
        <path d="M22 22L24 24" stroke="currentColor" strokeWidth="1" />
        <path d="M18 22L16 24" stroke="currentColor" strokeWidth="1" />
        
        {/* Outer nodes */}
        <circle cx="20" cy="5" r="1.5" />
        <circle cx="30" cy="10" r="1.5" />
        <circle cx="30" cy="26" r="1.5" />
        <circle cx="20" cy="35" r="1.5" />
        <circle cx="10" cy="26" r="1.5" />
        <circle cx="10" cy="10" r="1.5" />
        
        {/* Outer connecting lines */}
        <path d="M20 6.5L20 8" stroke="currentColor" strokeWidth="0.75" />
        <path d="M28.5 11L28 13" stroke="currentColor" strokeWidth="0.75" />
        <path d="M28.5 25L28 23" stroke="currentColor" strokeWidth="0.75" />
        <path d="M20 33.5L20 28" stroke="currentColor" strokeWidth="0.75" />
        <path d="M11.5 25L12 23" stroke="currentColor" strokeWidth="0.75" />
        <path d="M11.5 11L12 13" stroke="currentColor" strokeWidth="0.75" />
      </g>
    </svg>
  );
};

export default JupiterBrainsLogo;
