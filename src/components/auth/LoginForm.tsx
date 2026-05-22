import {
  useContext,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/auth.service";

import { AuthContext } from "../../context/AuthContext";

export default function LoginForm() {

  const { saveToken } =
    useContext(AuthContext);

  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (
    e: FormEvent
  ) => {

    e.preventDefault();

    const data = await login(form);

    saveToken(data.access_token);

    alert("Login exitoso");

    navigate("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit}>

      <input
        type="email"
        name="email"
        placeholder="Email"
        onChange={handleChange}
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        onChange={handleChange}
      />

      <button type="submit">
        Iniciar sesión
      </button>

    </form>
  );
}