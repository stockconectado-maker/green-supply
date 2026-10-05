export const ESTADOS_ASOCIADO = [
    'Interesado',
    'Consulta médica pendiente',
    'Alta pendiente',
    'Asociado activo',
    'Inactivo / Baja',
  ]
  
  export const ESTADOS_REPROCANN = [
    'No iniciado',
    'En trámite',
    'Aprobado',
    'Vencido',
  ]
  
  export const ESTADOS_DOCUMENTACION = [
    'Pendiente',
    'Completa',
  ]
  
  export function numeroSocio(id: number) {
    return `GS-${String(id).padStart(4, '0')}`
  }
  
  export function calcularProximaAccion(
    estadoAsociado: string | null,
    estadoReprocann: string | null,
    documentacion: string | null
  ) {
    const asociado =
      estadoAsociado ?? 'Interesado'
  
    const reprocann =
      estadoReprocann ?? 'No iniciado'
  
    const docs =
      documentacion ?? 'Pendiente'
  
    if (asociado === 'Inactivo / Baja') {
      return 'Sin acción'
    }
  
    if (asociado === 'Interesado') {
      return 'Contactar y confirmar interés'
    }
  
    if (
      asociado ===
      'Consulta médica pendiente'
    ) {
      return 'Coordinar consulta médica'
    }
  
    if (reprocann === 'Vencido') {
      return 'Regularizar REPROCANN'
    }
  
    if (reprocann === 'No iniciado') {
      return 'Iniciar trámite REPROCANN'
    }
  
    if (reprocann === 'En trámite') {
      return 'Hacer seguimiento REPROCANN'
    }
  
    if (
      reprocann === 'Aprobado' &&
      docs === 'Pendiente'
    ) {
      return 'Completar documentación'
    }
  
    if (
      asociado === 'Alta pendiente' &&
      reprocann === 'Aprobado' &&
      docs === 'Completa'
    ) {
      return 'Completar alta del asociado'
    }
  
    if (
      asociado === 'Asociado activo' &&
      reprocann === 'Aprobado' &&
      docs === 'Completa'
    ) {
      return 'Sin tareas pendientes'
    }
  
    return 'Revisar situación'
  }