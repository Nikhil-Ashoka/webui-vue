SUMMARY = "Python library to talk to the met.no api"
HOMEPAGE = "https://github.com/Danielhiversen/pyMetno"
LICENSE = "MIT"
LIC_FILES_CHKSUM = "file://LICENSE;md5=5d503272f52c35147ec960cb56a03bf4"

SRC_URI = "git://github.com/Danielhiversen/pyMetno.git;protocol=https;branch=master"
SRCREV = "d7a6161c7765bff19a276b29a6a689a59b03a63c"
S = "${WORKDIR}/git"

inherit setuptools3

PIP_INSTALL_PACKAGE = "PyMetno"

RDEPENDS:${PN} = "\
	${PYTHON_PN}-aiohttp (>=3.6.1) \
	${PYTHON_PN}-async-timeout (>=3.0.1) \
	${PYTHON_PN}-pytz (>=2019.3) \
"
