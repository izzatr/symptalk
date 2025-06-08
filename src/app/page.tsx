"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { v4 as uuidv4 } from "uuid";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

export default function Home() {
  return (
    <main className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
          Symptalk AI Chat
        </h1>
      </header>
      <div>Rasha will code here</div>
    </main>
  );
}
