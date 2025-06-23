import { useState, useEffect } from "react";
import axios from "axios";

export default function Notebook() {
  const [name, setName] = useState(""); // używamy 'name', bo backend tego oczekuje
  const [notebooks, setNotebooks] = useState([]);

  const fetchNotebooks = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://127.0.0.1:8000/view_user_notebooks", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotebooks(res.data);
    } catch (error) {
      console.error("Błąd podczas pobierania notatników:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    try {
      await axios.post(
        "http://127.0.0.1:8000/create_notebook",
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setName("");
      fetchNotebooks();
    } catch (error) {
      console.error("Błąd podczas tworzenia notatnika:", error);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-2">Nowy Notatnik</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          className="w-full p-2 border rounded"
          placeholder="Nazwa notatnika"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Zapisz
        </button>
      </form>

      <h3 className="text-lg font-semibold mt-6">Twoje Notatniki:</h3>
      <ul className="space-y-2 mt-2">
        {notebooks.map((note) => (
          <li key={note.id} className="border p-3 rounded">
            <h4 className="font-bold">{note.name}</h4>
            <p className="text-sm text-gray-500">
              Utworzono: {new Date(note.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
