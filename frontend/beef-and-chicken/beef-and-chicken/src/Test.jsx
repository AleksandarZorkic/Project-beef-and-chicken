export default function ProductCard({ title, price }) {
  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: "6px 0 0" }}>{price} RSD</p>
    </div>
  );
}

import {useState} from "react"
import Child from "./Child"

export default function Parent() {
    const [count, setCount] = useState(0)

    function handleIncrease() {
        setCount((prev) => prev + 1)
    }

    return (
        <div>
            <h2>Counter: {count}</h2>
            <Child onIncrease={handleIncrease}/>
        </div>
    )
}

export default function Child(onIncrease) {
    return <button onClick={onIncrease}></button>
}


import { useState } from "react";

export default function TodoApp() {
    const [text, setText] = useState("")
    const [todo, setTodo] = useState([])

    function addTodo(e) {
        e.preventDefault()
        const trimmed = text.trim();
        if (!trimmed) return

        const newTodo = { id: cryptio.randomUUIID(), text: trimmed}
        setTodo((prev) => [newTodo, ...prev])
        setText("");
    }

    function removeTodo(id) {
        setTodo((prev) => prev.filter((t) => t.id !==id ))
    }

    return (
        <div>
            <h2>Todo</h2>

            <form onSubmit={addTodo} style={{ display: "flex", gap: 8}}>
                <input value={text} onChange={(e) => setText(e.target.value)}/>
                <button type="submit">Dodaj</button>
            </form>

            <ul>
                {todo.map((e) => (
                    <li key={e.id} style={{ display: "flex", gap: 8}}>
                        <span>{t.text}</span>
                        <button onClick={() => removeTodo(t.id)}>Obrisi</button>
                    </li>
                ))}
            </ul>
        </div>
    )
}