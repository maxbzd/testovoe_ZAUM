export interface ToastMessage {
  id: number;
  text: string;
}

/** Всегда в DOM: так скринридеры озвучивают появление сообщения. */
export function Toast({ message }: { message: ToastMessage | null }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && (
        <p key={message.id} className="toast">
          {message.text}
        </p>
      )}
    </div>
  );
}
