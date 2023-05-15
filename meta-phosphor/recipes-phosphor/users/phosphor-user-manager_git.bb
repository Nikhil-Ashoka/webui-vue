SUMMARY = "Phosphor User Manager Daemon"
DESCRIPTION = "Daemon that does user management"
HOMEPAGE = "http://github.com/openbmc/phosphor-user-manager"
LICENSE = "Apache-2.0"
LIC_FILES_CHKSUM = "file://LICENSE;md5=e3fc50a88d0a364313df4b21ef20c29e"
DEPENDS += "sdbusplus"
DEPENDS += "phosphor-logging"
DEPENDS += "phosphor-dbus-interfaces"
DEPENDS += "bash"
DEPENDS += "boost"
DEPENDS += "nss-pam-ldapd"
DEPENDS += "systemd"
SRCREV = "5a73a3047bfdbf7222183ab3c087df8d0d525a31"
PV = "1.0+git${SRCPV}"
PR = "r1"

SRC_URI = "git://github.com/ibm-openbmc/phosphor-user-manager;nobranch=1;protocol=https"
SRC_URI += "file://upgrade_hostconsole_group.sh"
SRC_URI += "file://upgrade_ibm_service_account.sh"

S = "${WORKDIR}/git"

inherit meson pkgconfig
inherit obmc-phosphor-dbus-service
inherit useradd

EXTRA_OEMESON = "-Dtests=disabled"
EXTRA_OECONF:append = "enable_root_user_mgmt=no"

do_install:append() {
  install -d ${D}${libexecdir}
  install -m 0755 ${WORKDIR}/upgrade_hostconsole_group.sh ${D}${libexecdir}/upgrade_hostconsole_group.sh
  install -d ${D}/home/service
  echo "/usr/bin/sudo -s;exit" >${D}/home/service/.profile
  install -d ${D}${bindir}
  install -m 0755 ${WORKDIR}/upgrade_ibm_service_account.sh ${D}${bindir}/upgrade_ibm_service_account.sh
}

RDEPENDS:${PN} += "bash"

FILES:phosphor-ldap += " \
        ${bindir}/phosphor-ldap-conf \
"
FILES:${PN} += " \
        ${systemd_unitdir} \
        ${datadir}/dbus-1 \
        ${datadir}/phosphor-certificate-manager \
"
FILES:${PN} += " /home/service/.profile "

USERADD_PACKAGES = "${PN} phosphor-ldap"

PACKAGE_BEFORE_PN = "phosphor-ldap"
DBUS_PACKAGES = "${USERADD_PACKAGES}"
# add groups needed for privilege maintenance
GROUPADD_PARAM:${PN} = "priv-admin; priv-operator; priv-user "
GROUPADD_PARAM:phosphor-ldap = "priv-admin; priv-operator; priv-user "
DBUS_SERVICE:${PN} += "xyz.openbmc_project.User.Manager.service"
DBUS_SERVICE:phosphor-ldap = " \
        xyz.openbmc_project.Ldap.Config.service \
"

EXTRA_USERS_PARAMS += " \
   groupadd hostconsole; \
   "

EXTRA_USERS_PARAMS += " \
  usermod --append --groups hostconsole root; \
  "
