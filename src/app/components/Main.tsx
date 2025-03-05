"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "../lib/utils";

export default function Main() {
  const queryClient = useQueryClient();
  const [x, setX] = useState(true);
  return (
   <div>
     <div className="flex flex-col items-center justify-center h-screen">
       <div className={cn("text-[8em]", x ? "text-primary-100" : "text-dark-100")}>Hello!!</div>
       <button onClick={() => setX(!x)}>Button</button>
     </div>
   </div>
  );
}
