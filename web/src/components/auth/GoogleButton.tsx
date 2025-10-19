import Image from 'next/image';

interface GoogleButtonProps {
  onClick: () => void;
}

const GoogleButton = ({ onClick }: GoogleButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3"
    >
      <Image src="/google.png" alt="Google logo" width={200} height={60} />
    </button>
  );
};

export default GoogleButton;
