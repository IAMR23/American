import Swal from "sweetalert2";

export const showSuccess = (title, text = "") =>
  Swal.fire({
    icon: "success",
    title,
    text,
    confirmButtonColor: "#0d6efd",
  });

export const showError = (title, text = "") =>
  Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#dc3545",
  });

export const showInfo = (title, text = "") =>
  Swal.fire({
    icon: "info",
    title,
    text,
    confirmButtonColor: "#0d6efd",
  });

export const confirmAction = async ({
  title = "Estas seguro?",
  text = "Esta accion no se puede deshacer.",
  confirmButtonText = "Si, continuar",
  cancelButtonText = "Cancelar",
} = {}) => {
  const result = await Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true,
  });

  return result.isConfirmed;
};
