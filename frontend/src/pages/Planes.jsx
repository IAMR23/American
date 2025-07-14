import React from "react";
import Paypal from "../components/Paypal";
import PaypalSuscripcion from "../components/PaypalSuscripcion";
import PlantTest from "../components/PlanTest";

export default function Planes() {
  return (
    <div className="container">
      <div className="row g-4 justify-content-center">
        <div className="col-12 col-lg-6 ">
          <div className="card border-primary bg-dark h-100">
            <div className="card-body d-flex flex-column">
              <div className="text-light">
                <h3 className="fw-bold ">Hobby</h3>
                <p className="">
                  For hobbyist developers looking to showcase their side
                  projects.
                </p>
              </div>

              <div className="mt-auto">
                <div className="d-flex align-items-center mb-2">
                  <span className="fs-3">$</span>
                  <span className="display-1 fw-semibold">5</span>
                  <span className="fs-2">/mo</span>
                </div>
                <div className="text-uppercase fw-semibold small  mb-3">
                  Minimum Spend
                </div>
                <ul className="list-unstyled ">
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Includes $5 of usage monthly
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    8 GB RAM / 8 vCPU per service
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Single developer workspace
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Community support
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    7-day log history
                  </li>
                  <li className="d-flex align-items-center">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Global regions{" "}
                    <span className="badge bg-primary ms-2">New!</span>
                  </li>
                </ul>
                <a
                  href="/workspace/upgrade"
                  className="btn btn-primary w-100 mt-3"
                >
                  Deploy with Hobby 
                  <Paypal/>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-danger bg-dark h-100">
            <div className="card-body d-flex flex-column">
              <div>
                <h3 className="text-light fw-bold">
                  Pro <span className="text-light fs-6">ⓘ</span>
                </h3>
                <p className="text-light">
                  For professional developers and teams shipping to production.
                </p>
              </div>

              <div className="mt-auto text-light">
                <div className="d-flex align-items-center mb-2">
                  <span className="fs-3">$</span>
                  <span className="display-1 fw-semibold">20</span>
                  <span className="fs-2">/mo</span>
                </div>
                <div className="text-uppercase fw-semibold small text-light mb-3 ">
                  Minimum Spend
                </div>
                <ul className="list-unstyled text-light">
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Includes $20 of usage monthly{" "}
                    <span className="badge bg-danger ms-2">New!</span>
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    32 GB RAM / 32 vCPU per service
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Unlimited team seats included{" "}
                    <span className="badge bg-danger ms-2">New!</span>
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Railway Support (1 Business Day)
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    30-day log history
                  </li>
                  <li className="d-flex align-items-center mb-2">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    SOC2 compliance report
                  </li>
                  <li className="d-flex align-items-center">
                    <svg
                      className="me-2"
                      width="20"
                      height="20"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                      strokeLinecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                    Multiple concurrent regions
                  </li>
                </ul>
                <button className="btn btn-primary w-100 mt-3">
                  <PaypalSuscripcion /> 
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlantTest/>

    </div>
  );
}
