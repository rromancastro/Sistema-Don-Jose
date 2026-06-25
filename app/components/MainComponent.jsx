import { IoCartOutline } from "react-icons/io5"
import { NavComponent } from "./NavComponent"
import { FiBox, FiClipboard, FiDollarSign, FiUsers } from "react-icons/fi"
import { FaArrowRight, FaRegChartBar, FaUserCheck } from "react-icons/fa"
import { GoHistory, GoPlus } from "react-icons/go"
import { LuFileSpreadsheet } from "react-icons/lu"
import Link from "next/link"

export const MainComponent = () => {


    return <section>
        <NavComponent bgColor="#7F22FE" main={true}>
            <img src={'/logo-blanco.png'} alt="logo" />
            <h1>Control de Negocio - Don José</h1>
        </NavComponent >
        <div id="mainInfoCardsContainer">
            <h2>Hoy</h2>
            <div>
                <article className="mainInfoCard boxShadow">
                    <div className="bgColorVerde">
                        <FiDollarSign />
                    </div>
                    <p>Ventas</p>
                    <p>$0.00</p>
                </article>
                <article className="mainInfoCard boxShadow">
                    <div className="bgColorNaranja">
                        <IoCartOutline />
                    </div>
                    <p>Compras</p>
                    <p>$0.00</p>
                </article>
            </div>
        </div>

        <div id="mainInfoCardsContainer">
            <h2>Stock Actual</h2>
            <div>
                <Link href={'/stock'} className="mainInfoCard boxShadow animClick">
                    <div className="bgColorVioleta">
                        <FiBox />
                    </div>
                    <p>Deshidratado</p>
                    <p>5000 kg</p>
                </Link>
                <Link href={'/stock'} className="mainInfoCard boxShadow animClick">
                    <div className="bgColorAzul">
                        <FiBox />
                    </div>
                    <p>Fruta Fresca</p>
                    <p>5000 kg</p>
                </Link>
            </div>
        </div>

        <div id="mainAccionesContainer">
            <h2>Acciones Rapidas</h2>
            <div>
                <Link href={'/nueva-venta'} className="accionesCard boxShadow animClick bgColorVerde bdRadius">
                    <FiDollarSign />
                    <p>Nueva Venta</p>
                    <GoPlus />
                </Link>
                <Link href={'/nueva-compra'} className="accionesCard boxShadow animClick bgColorNaranja bdRadius">
                    <IoCartOutline />
                    <p>Nueva Compra</p>
                    <GoPlus />
                </Link>
                <article className="accionesCard boxShadow animClick bgColorVioleta bdRadius">
                    <FaArrowRight />
                    <p>Nueva Transformación</p>
                    <GoPlus />
                </article>
            </div>
        </div>

        <div className="gestionContainer">
            <h2>Gestión</h2>
            <div>
                <Link href={'/proveedores'} className="gestionCard bdRadius animClick boxShadow">
                    <FiUsers />
                    <p>Proveedores</p>
                </Link>
                <Link href={'/clientes'} className="gestionCard bdRadius animClick boxShadow">
                    <FaUserCheck />
                    <p>Clientes</p>
                </Link>
                <Link href={'/presupuestos'} className="gestionCard bdRadius animClick boxShadow">
                    <FiClipboard />
                    <p>Presupuestos</p>
                </Link>
                <Link href={'/documentos'} className="gestionCard bdRadius animClick boxShadow">
                    <LuFileSpreadsheet />
                    <p>Documentos</p>
                </Link>
            </div>
        </div>

        <div className="gestionContainer">
            <h2>Consultas</h2>
            <div>
                <article className="gestionCard bdRadius animClick boxShadow">
                    <GoHistory />
                    <p>Historial</p>
                </article>
                <article className="gestionCard bdRadius animClick boxShadow">
                    <FaRegChartBar />
                    <p>Reportes</p>
                </article>
            </div>
        </div>
    </section>
}