import { useState, useEffect } from 'react';

interface ProfilePicProps {
  hash: string | undefined;
  width: number;
  height: number;
  marginTop?: number;
  name?: string;
}

function ProfilePic({ hash, width, height, marginTop, name }: ProfilePicProps) {
  const [color1, setColor1] = useState('');
  const [color2, setColor2] = useState('');

  const generateColor = () => {
    if (typeof hash === 'string' && hash.length >= 16) {
      const color1 = '#' + hash?.slice(2, 8);
      const color2 = '#' + hash?.slice(8, 16);
      setColor1(color1);
      setColor2(color2);
    }
  };

  useEffect(() => {
    generateColor();
  }, [hash]);
  return (
    <div
      style={{
        background: `linear-gradient(${color1}, ${color2})`,
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: `${height / 2}px`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white',
        marginTop: `${marginTop}px`,
        fontWeight: 'bold',
      }}
    >
      {name?.[0]}
    </div>
  );
}

export default ProfilePic;
