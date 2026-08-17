import React from 'react';
import { Navigate } from 'react-router-dom';
// Bio auth uses main login/register
export default function BioRegister() { return <Navigate to="/login" replace />; }
