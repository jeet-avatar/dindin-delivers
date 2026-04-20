import { useNavigate } from 'react-router-dom';

export function Logo() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate('/')}
      className="cursor-pointer transition-opacity duration-200 hover:opacity-80"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate('/');
        }
      }}
      aria-label="Navigate to Dashboard"
    >
      <svg
        width="180"
        height="50"
        viewBox="0 0 180 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Orange Circular Icon */}
        <circle cx="25" cy="25" r="20" fill="#FF6B35" />

        {/* "B" inside circle */}
        <text
          x="25"
          y="25"
          fontSize="24"
          fontWeight="bold"
          fill="white"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
        >
          B
        </text>

        {/* "Zietra" text */}
        <text
          x="55"
          y="25"
          fontSize="20"
          fontWeight="700"
          fill="#1C1C1E"
          dominantBaseline="central"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
        >
          Brand
        </text>
        <text
          x="112"
          y="25"
          fontSize="20"
          fontWeight="700"
          fill="#FF6B35"
          dominantBaseline="central"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Text', 'Segoe UI', sans-serif"
        >
          Monkz
        </text>
      </svg>
    </div>
  );
}
