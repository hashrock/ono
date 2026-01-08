import logo from './logo.png';
import icon from './icon.svg';

function WithAssets() {
  return (
    <div>
      <img src={logo} alt="Logo" />
      <img src={icon} alt="Icon" />
    </div>
  );
}

export default WithAssets;
