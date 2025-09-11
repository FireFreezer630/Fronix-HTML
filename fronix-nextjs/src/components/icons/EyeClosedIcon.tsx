import React from 'react';

const EyeClosedIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9.9 4.24A9 9 0 0 1 12 3c7 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"></path>
    <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
    <line x1="2" x2="22" y1="2" y2="22"></line>
    <path d="M14 14.25a3 3 0 0 1-4.3-4.3"></path>
  </svg>
);

export default EyeClosedIcon;
