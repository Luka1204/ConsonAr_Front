import LoginForm from "../components/auth/LoginForm";

export default function LoginPage(){
    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-title">ConsonAr</div>
                <div className="login-subtitle">Sistema de Reconocimiento Musical</div>
                <LoginForm />
            </div>
        </div>
    )
}
