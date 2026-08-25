import styles from "./Footer.module.css";
import logo from "../../assets/images/logo.svg";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <span className={styles.footerCopy}>Powered by</span>
      <img src={logo} alt="DigiKhata" className={styles.footerLogo} />
    </footer>
  );
}
