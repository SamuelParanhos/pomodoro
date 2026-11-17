import { ConfirmDialog } from './ConfirmDialog';

type DeleteDialogProps = {
    kind: 'tarefa' | 'temporizador';
    name: string;
    onCancel: () => void;
    onConfirm: () => boolean;
};

export function DeleteDialog({ kind, name, onCancel, onConfirm }: DeleteDialogProps) {
    return (
        <ConfirmDialog
            title={`Excluir ${kind}?`}
            description={
                <>
                    Você está prestes a excluir <strong>“{name}”</strong>. Essa ação não pode ser
                    desfeita.
                </>
            }
            confirmLabel={`Excluir ${kind}`}
            onCancel={onCancel}
            onConfirm={onConfirm}
        />
    );
}
