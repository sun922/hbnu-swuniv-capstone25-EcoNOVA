import styles from "./layout.module.css"; 
import logo from "../assets/logo.png";


export default function Header(){
    return(
        <header className={styles.header}>
            <div className={styles.logobox}>
                <img src={logo} alt="PAPER Dashboard" className={styles.logo} />
            </div>
            
            {/* <strong className={styles.title}>Echart Dashboard</strong> */}
        </header>
    );
}