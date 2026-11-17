import { useEffect, useRef, useState, type ReactNode } from 'react';

type ConfirmDialogProps = {
    title: string;
    description: ReactNode;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: () => boolean;
};

export function ConfirmDialog({
    title,
    description,
    confirmLabel,
    onCancel,
    onConfirm,
}: ConfirmDialogProps) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const element = dialog.current;
        element?.showModal();
        return () => element?.close();
    }, []);

    return (
        <dialog
            ref={dialog}
            className="delete-dialog"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            onCancel={(event) => {
                event.preventDefault();
                onCancel();
            }}
        >
            <div className="delete-icon" aria-hidden="true">
                ×
            </div>
            <h2 id="delete-title">{title}</h2>
            <p id="delete-description">{description}</p>
            {failed && (
                <p role="alert" className="delete-error">
                    Não foi possível concluir a ação. Verifique o armazenamento do navegador e tente
                    novamente.
                </p>
            )}
            <div className="form-actions">
                <button type="button" autoFocus onClick={onCancel}>
                    Cancelar
                </button>
                <button
                    type="button"
                    className="danger"
                    onClick={() => {
                        if (!onConfirm()) setFailed(true);
                    }}
                >
                    {confirmLabel}
                </button>
            </div>
        </dialog>
    );
}
