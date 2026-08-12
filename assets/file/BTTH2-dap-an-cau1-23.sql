--III. Ngôn ngữ truy vấn dữ liệu:
--1.  In ra danh sách các sản phẩm (MASP,TENSP) do "Trung Quoc" sản xuất.
select MASP, TENSP
from SANPHAM
where NUOCSX = 'Trung Quoc';
--2. In ra danh sách các sản phẩm (MASP, TENSP) có đơn vị tính là "cay", "quyen".
select MASP, TENSP
from SANPHAM
where DVT = 'cay' or DVT = 'quyen';

select MASP, TENSP
from SANPHAM
where DVT IN ('cay', 'quyen');
--3. In ra danh sách các sản phẩm (MASP,TENSP) có mã sản phẩm bắt đầu là "B" và kết thúc là "01".
select MASP, TENSP
from SANPHAM
where MASP LIKE ('B%01');
--4. In ra danh sách các sản phẩm (MASP,TENSP) do "Trung Quốc" sản xuất có giá từ 30.000 đến 40.000.
select MASP, TENSP
from SANPHAM
where NUOCSX = 'Trung Quoc' and (GIA>=30000 and GIA <=40000);

select MASP, TENSP
from SANPHAM
where NUOCSX = 'Trung Quoc' and (GIA between 30000 and 40000);
--5. In ra danh sách các sản phẩm (MASP,TENSP) do "Trung Quoc" hoặc "Thai Lan" sản xuất có giá từ 30.000 đến 40.000.
select MASP, TENSP
from SANPHAM
where (NUOCSX = 'Trung Quoc' or NUOCSX = 'Thai Lan') and (GIA>=30000 and GIA <=40000);

select MASP, TENSP
from SANPHAM
where NUOCSX IN ('Trung Quoc', 'Thai Lan') and (GIA between 30000 and 40000);
--6. In ra các số hóa đơn, trị giá hóa đơn bán ra trong ngày 1/1/2007 và ngày 2/1/2007.
select SOHD, TRIGIA
from HOADON
where NGHD = '1/1/2007' or NGHD = '2/1/2007';

select SOHD, TRIGIA
from HOADON
where NGHD IN ('1/1/2007', '2/1/2007');
--7. In ra các số hóa đơn, trị giá hóa đơn trong tháng 1/2007, sắp xếp theo ngày (tăng dần) và
--trị giá của hóa đơn (giảm dần).
select SOHD, NGHD, TRIGIA
from HOADON
where year(NGHD) = 2007 and month(NGHD) = 1
order by NGHD ASC, TRIGIA DESC;
--8. In ra danh sách các khách hàng (MAKH, HOTEN) đã mua hàng trong ngày 1/1/2007.
select hd.MAKH, HOTEN
from KHACHHANG kh join HOADON hd ON kh.MAKH = hd.MAKH
where NGHD = '1/1/2007';

select MAKH, HOTEN
from KHACHHANG
where MAKH IN (select MAKH
				from HOADON
				where NGHD = '1/1/2007');
--9. In ra số hóa đơn, trị giá các hóa đơn do nhân viên có tên "Nguyen Van B" lập trong ngày 28/10/2006.
select SOHD, TRIGIA
from HOADON hd join NHANVIEN nv ON hd.MANV = nv.MANV
where HOTEN = 'Nguyen Van B' and NGHD = '28/10/2006';

select SOHD, TRIGIA
from HOADON
where NGHD = '28/10/2006' and MANV IN (select MANV
										from NHANVIEN
										where HOTEN = 'Nguyen Van B');
--10. In ra danh sách các sản phẩm (MASP,TENSP) được khách hàng có tên "Nguyen Van A"
--mua trong tháng 10/2006.
select sp.MASP, TENSP
from SANPHAM sp join CTHD ct ON sp.MASP = ct.MASP
				join HOADON hd ON hd.SOHD = ct.SOHD
				join KHACHHANG kh ON kh.MAKH = hd.MAKH
where HOTEN = 'Nguyen Van A' and year(NGHD) = 2006 and month(NGHD) = 10;

select MASP, TENSP
from SANPHAM
where MASP IN (select MASP
				from CTHD
				where SOHD IN (select SOHD
								from HOADON
								where year(NGHD) = 2006 and month(NGHD) = 10
														and MAKH IN (select MAKH
																	from KHACHHANG
																	where HOTEN = 'Nguyen Van A')));
--11. Tìm các số hóa đơn đã mua sản phẩm có mã số "BB01" hoặc "BB02".
select distinct SOHD
from CTHD
where MASP = 'BB01' or MASP = 'BB02';

select distinct SOHD
from CTHD
where MASP IN ('BB01', 'BB02');

(select SOHD
from CTHD
where MASP = 'BB01')
UNION
(select SOHD
from CTHD
where MASP = 'BB02')
--12. Tìm các số hóa đơn đã mua sản phẩm có mã số "BB01" hoặc "BB02", mỗi sản phẩm
--mua với số lượng từ 10 đến 20.
select distinct SOHD
from CTHD
where (MASP = 'BB01' or MASP = 'BB02') and (SL between 10 and 20);

select distinct SOHD
from CTHD
where MASP IN ('BB01', 'BB02') and (SL between 10 and 20);

(select SOHD
from CTHD
where MASP = 'BB01' and (SL between 10 and 20))
UNION
(select SOHD
from CTHD
where MASP = 'BB02' and (SL between 10 and 20))
--13. Tìm các số hóa đơn mua cùng lúc 2 sản phẩm có mã số "BB01" và "BB02", mỗi sản
--phẩm mua với số lượng từ 10 đến 20.
(select SOHD
from CTHD
where MASP = 'BB01' and (SL between 10 and 20))
INTERSECT
(select SOHD
from CTHD
where MASP = 'BB02' and (SL between 10 and 20))
--14. In ra danh sách các sản phẩm (MASP,TENSP) do "Trung Quoc" sản xuất hoặc các sản
--phẩm được bán ra trong ngày 1/1/2007.
(select MASP, TENSP
from SANPHAM
where NUOCSX = 'Trung Quoc')
UNION
(select sp.MASP, TENSP
from SANPHAM sp join CTHD ct ON sp.MASP = ct.MASP
				join HOADON hd ON hd.SOHD = ct.SOHD
where NGHD = '1/1/2007');
-----------------------
select distinct sp.MASP, TENSP
from SANPHAM sp left join CTHD ct ON sp.MASP = ct.MASP
				left join HOADON hd ON hd.SOHD = ct.SOHD
where NUOCSX = 'Trung Quoc' or NGHD = '1/1/2007';
-----------------------
select MASP, TENSP
from SANPHAM
where NUOCSX = 'Trung Quoc' or MASP IN (select MASP
										from CTHD
										where SOHD IN (select SOHD
														from HOADON
														where NGHD = '1/1/2007'));
--15. In ra danh sách các sản phẩm (MASP,TENSP) không bán được.
select MASP, TENSP
from SANPHAM
where MASP IN ((select MASP
			from SANPHAM)
			except
			(select distinct MASP
			from CTHD));
---------------------
select MASP, TENSP
from SANPHAM
where MASP NOT IN (select distinct MASP
				from CTHD);
---------------------
(select MASP, TENSP
from SANPHAM)
except
(select distinct ct.MASP, TENSP
from SANPHAM sp join CTHD ct ON sp.MASP = ct.MASP);
--16. In ra danh sách các sản phẩm (MASP,TENSP) không bán được trong năm 2006.
select MASP, TENSP
from SANPHAM
where MASP NOT IN (select distinct MASP
					from CTHD ct join HOADON hd ON ct.SOHD = hd.SOHD
					where year(NGHD) = 2006 );
---------------------
(select MASP, TENSP
from SANPHAM)
except
(select distinct ct.MASP, TENSP
from SANPHAM sp join CTHD ct ON sp.MASP = ct.MASP
				join HOADON hd ON ct.SOHD = hd.SOHD
where year(NGHD) = 2006 );
------------------------
select MASP, TENSP
from SANPHAM
where MASP NOT IN (select distinct MASP
					from CTHD
					where SOHD IN (select SOHD
									from HOADON
									where year(NGHD) = 2006));
--17. In ra danh sách các sản phẩm (MASP,TENSP) do "Trung Quoc" sản xuất không bán
--được trong năm 2006.
select MASP, TENSP
from SANPHAM
where NUOCSX = 'Trung Quoc' and MASP NOT IN (select distinct MASP
					from CTHD ct join HOADON hd ON ct.SOHD = hd.SOHD
					where year(NGHD) = 2006 );
---------------------
(select MASP, TENSP
from SANPHAM
where NUOCSX = 'Trung Quoc')
except
(select distinct ct.MASP, TENSP
from SANPHAM sp join CTHD ct ON sp.MASP = ct.MASP
				join HOADON hd ON ct.SOHD = hd.SOHD
where year(NGHD) = 2006 );
------------------------
select MASP, TENSP
from SANPHAM
where NUOCSX = 'Trung Quoc' and MASP NOT IN (select distinct MASP
											from CTHD
											where SOHD IN (select SOHD
															from HOADON
															where year(NGHD) = 2006));
--Câu 18. Thống kê số lượng hóa đơn do mỗi nhân viên lập trong năm 2006, hiển thị (MANV, HOTEN, SoLuongHD).
select nv.MANV, HOTEN, count(*) as SoLuongHD
from NHANVIEN nv join HOADON hd on nv.MANV = hd.MANV
where year(NGHD) = 2006
group by nv.MANV, HOTEN;
--Câu 19. In ra danh sách nhân viên và tổng số khách hàng khác nhau mà họ đã bán hàng cho trong năm 2006.
select nv.MANV, nv.HOTEN, count(distinct hd.MAKH) as TongSoKH
from NHANVIEN nv join HOADON hd on nv.MANV = hd.MANV
				join KHACHHANG kh on kh.MAKH = hd.MAKH
where year(NGHD) = 2006
group by nv.MANV, nv.HOTEN;

--Câu 20. Liệt kê sản phẩm (MASP, TENSP) có tổng số lượng bán ra nhiều nhất trong năm 2006.
select top 1 with ties sp.MASP, TENSP, sum(SL) as TongSoLuong
from SANPHAM sp join CTHD ct on sp.MASP = ct.MASP
				join HOADON hd on hd.SOHD = ct.SOHD
where year(NGHD) = 2006
group by sp.MASP, TENSP
order by TongSoLuong DESC;

--Câu 21. Tìm nhân viên có doanh số bán hàng cao nhất trong tháng 10/2006.
select top 1 with ties nv.MANV, HOTEN, sum(TRIGIA) as TongDoanhSo
from NHANVIEN nv join HOADON hd on nv.MANV = hd.MANV
where month(NGHD) = 10 and year(NGHD) = 2006
group by nv.MANV, HOTEN
order by TongDoanhSo DESC;
--Câu 22. In ra danh sách sản phẩm không bán được trong năm 2007 nhưng có bán trong năm 2006.
(select sp.MASP, TENSP
from SANPHAM sp join CTHD ct on sp.MASP = ct.MASP
				join HOADON hd on hd.SOHD = ct.SOHD
where year(NGHD) = '2006')
except
(select sp.MASP, TENSP
from SANPHAM sp join CTHD ct on sp.MASP = ct.MASP
				join HOADON hd on hd.SOHD = ct.SOHD
where year(NGHD) = '2007');
--Câu 23. Liệt kê danh sách sản phẩm (MASP, TENSP) được bán bởi ít nhất 2 nhân viên khác nhau.
select sp.MASP, TENSP, count(distinct MANV) as SLNVBan
from SANPHAM sp join CTHD ct on sp.MASP = ct.MASP
				join HOADON hd on hd.SOHD = ct.SOHD
group by sp.MASP, TENSP
having count(distinct MANV) >=2;
