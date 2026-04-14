"use client";

import { useEffect, useState } from "react";

export default function CollectionPage() {
  const [items, setItems] = useState([
    { id: 1, name: "Mickey", image: "/placeholder.png" },
    { id: 2, name: "Elsa", image: "/placeholder.png" },
    { id: 3, name: "Stitch", image: "/placeholder.png" },
    { id: 4, name: "Woody", image: "/placeholder.png" },
  ]);

  return (
    <>
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          padding: 20px;
          color: white;
        }

        .title {
          font-size: clamp(1.8rem, 5vw, 2.5rem);
          font-weight: 900;
          margin-bottom: 16px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }

        .card {
          background: white;
          color: #111827;
          border-radius: 16px;
          padding: 12px;
          text-align: center;
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }

        .image {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 12px;
          margin-bottom: 8px;
        }

        .name {
          font-weight: 800;
          font-size: 14px;
        }

        /* Tablet */
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Mobile */
        @media (max-width: 480px) {
          .grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .card {
            padding: 10px;
          }

          .image {
            height: 90px;
          }

          .name {
            font-size: 13px;
          }
        }
      `}</style>

      <main className="page">
        <h1 className="title">My Collection 💜</h1>

        <div className="grid">
          {items.map((item) => (
            <div key={item.id} className="card">
              <img src={item.image} className="image" />
              <div className="name">{item.name}</div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}